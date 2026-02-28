const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;


app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yovi';
const dbName = process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi';
let db;
let client;

async function connectToMongo() {
  client = new MongoClient(mongoUri);
  await client.connect();
  console.log(`Connected successfully to MongoDB (${process.env.NODE_ENV || 'development'} mode)`);
  db = client.db(dbName);
}

// Optional: Function to close connection (useful for tests)
async function closeMongoConnection() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Your /createuser endpoint (unchanged)
app.post('/createuser', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  const { username, email, password } = req.body;

  try {
    const usersCollection = db.collection('users');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
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
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { app, connectToMongo, closeMongoConnection };

if (process.env.NODE_ENV !== 'test') {
  async function startServer() {
    await connectToMongo();
    app.listen(port, () => {
      console.log(`User service listening at http://localhost:${port}`);
    });
  }
  startServer();
}