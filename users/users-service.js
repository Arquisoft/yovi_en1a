const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yovi';
const dbName = 'yovi';
let db;

async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('Connected successfully to MongoDB');
    db = client.db(dbName);
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
}

app.post('/createuser', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  const { username, email, password } = req.body;

  // Validations
  // if (!username || !email || !password) {
  //   return res.status(400).json({ error: 'Username, email and password are all required' });
  // }

  try {
    const usersCollection = db.collection('users');

    // hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username: username,
      email: email,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    console.log(`User ${username} created with id: ${result.insertedId}`);
    res.status(201).json({
      message: `Welcome ${username}! Your account was created.`,
      userId: result.insertedId
    });

  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) { // duplicate key error
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = app

async function startServer() {
  await connectToMongo();
  app.listen(port, () => {
    console.log(`User service listening at http://localhost:${port}`);
  });
}

startServer();