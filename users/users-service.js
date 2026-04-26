const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const app = express();

const openApiSpec = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// -------------------- CORS Configuration --------------------
// In production set ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
// Never include http://0.0.0.0 — that is a server bind address, not a browser origin.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost', 'http://localhost:3000', 'http://127.0.0.1'];
app.options('*', cors());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (same-origin, curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Prometheus setup

app.use(express.json());
const promBundle = require('express-prom-bundle');
const metricsMiddleware = promBundle({ includeMethod: true });
app.use(metricsMiddleware);

// -------------------- MongoDB Connection --------------------
let client;
let db;

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

async function connectToMongo(uri) {
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
  });

  client.on('connectionReady', () => console.log('MongoDB connected'));
  client.on('connectionClosed', () => {
    console.warn('MongoDB connection closed');
    db = null;
  });
  client.on('error', (err) => console.error('MongoDB client error:', err));

  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB database: ${DB_NAME}`);

  // prevent double username or email by creating field as index in mongodb
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  console.log('Unique indexes ensured for email and username');

  return client;
}

async function closeMongoConnection() {
  if (client) {
    await client.close();
    db = null;
    console.log('MongoDB connection closed');
  }
}

// -------------------- DB Health Middleware --------------------
app.use(async (req, res, next) => {
  if (req.path === '/createuser' || req.path === '/login') {
    if (!db) {
      return res.status(503).json({ error: 'Database not initialized' });
    }
    try {
      await db.command({ ping: 1 });
      next();
    } catch (err) {
      console.error('Database health check failed:', err.message);
      try {
        await client.connect();
        next();
      } catch (reconnectErr) {
        console.error('Reconnection failed:', reconnectErr.message);
        res.status(503).json({ error: 'Database temporarily unavailable' });
      }
    }
  } else {
    next();
  }
});




// -------------------- Routes --------------------
app.post('/createuser', async (req, res) => {
  const { username, email, password, avatarUrl } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'Missing required fields: username, email, and password are required'
    });
  }

  const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,64}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = {
      username,
      email,
      password: hashedPassword,
      avatarUrl: avatarUrl || 'default.png',
      createdAt: new Date()
    };

    const result = await db.collection('users').insertOne(newUser);

    // GENERATE TOKEN IMMEDIATELY AFTER REGISTRATION
    const token = jwt.sign(
      { userId: result.insertedId, username: newUser.username, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: `Hello ${username}! Welcome to the course!`,
      token, // Now included so the frontend can save it
      userId: result.insertedId,
      avatarUrl: newUser.avatarUrl,
      username: newUser.username
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyPattern?.email ? 'email' : 'username';
      return res.status(409).json({ error: `An account with this ${field} already exists` });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      error: 'Missing required fields: username/email and password are required'
    });
  }

  try {
    const user = await db.collection('users').findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // GENERATE JWT TOKEN
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({
      message: `Login successful for ${user.username}`,
      token,
      username: user.username
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------- Server Startup --------------------

const PORT = process.env.PORT || 3000;

// Bind to 0.0.0.0 so the service is reachable from outside the host/container.
// To restrict to loopback only, set HOST=127.0.0.1 in your environment.
// Firewall / reverse-proxy (nginx, ALB, etc.) should control external exposure.
const HOST = process.env.HOST || '0.0.0.0';

async function startServer(uri = MONGO_URI, port = PORT, host = HOST) {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  await connectToMongo(uri);

  return new Promise((resolve) => {
    const server = app.listen(port, host, () => {
      console.log(`User service listening at http://${host}:${port}`);
      resolve(server);
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = { app, connectToMongo, closeMongoConnection, JWT_SECRET, startServer };