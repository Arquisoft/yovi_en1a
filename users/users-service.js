const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// -------------------- CORS Configuration --------------------
// In production set ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
// Never include http://0.0.0.0 — that is a server bind address, not a browser origin.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost', 'http://localhost:3000', 'http://127.0.0.1'];

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

app.use(express.json());

// -------------------- MongoDB Connection --------------------
let client;
let db;

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== 'test') {
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

module.exports = { app, connectToMongo, closeMongoConnection, JWT_SECRET };

// -------------------- Routes --------------------

app.post('/createuser', async (req, res) => {
  if (!db) {
    console.error('Database not available when attempting to create user');
    return res.status(500).json({ error: 'Database not available' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'Missing required fields: username, email, and password are required'
    });
  }

  // Validation of email format with regex (abc@abc.com)
  const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,64}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    res.status(200).json({
      message: `Hello ${username}! Welcome to the course!`,
      userId: result.insertedId
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyPattern?.email ? 'email' : 'username';
      return res.status(409).json({ error: `An account with this ${field} already exists` });
    }

    if (error.name === 'MongoNotConnectedError' || error.message.includes('not connected')) {
      console.error('MongoDB not connected, attempting to reconnect...');
      try {
        await client.connect();
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({
          username,
          email,
          password: hashedPassword,
          createdAt: new Date()
        });
        return res.status(200).json({
          message: `Hello ${username}! Welcome to the course!`,
          userId: result.insertedId
        });
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        return res.status(503).json({ error: 'Database temporarily unavailable, please try again' });
      }
    }

    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  if (!db) {
    console.error('Database not available when attempting login');
    return res.status(500).json({ error: 'Database not available' });
  }

  const { usernameOrEmail, password } = req.body;

  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      error: 'Missing required fields: username/email and password are required'
    });
  }

  try {
    // Look up user by username OR email
    const user = await db.collection('users').findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
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

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      if (!MONGO_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }
      await connectToMongo(MONGO_URI);

      app.listen(PORT, HOST, () => {
        console.log(`User service listening at http://${HOST}:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  })();
}