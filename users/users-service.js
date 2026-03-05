const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

app.use(express.json());

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi';
let db, client;

async function connectToMongo(uri = mongoUri) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
}

async function closeMongoConnection() {
  await client?.close();
}

app.post('/createuser', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not available' });

  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.collection('users').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    });

    res.status(201).json({
      message: `Welcome ${username}! Your account was created.`,
      userId: result.insertedId
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { app, connectToMongo, closeMongoConnection };

if (process.env.NODE_ENV !== 'test') {
  connectToMongo().then(() => {
    app.listen(PORT, () => console.log(`User service listening at http://localhost:${PORT}`));
  });
}