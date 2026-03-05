const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const cors = require('cors');  // Fixed: changed from import to require

const app = express();

app.use(cors({ origin: '*' }));
const PORT = 3000;

app.use(express.json());

let db, client;

async function connectToMongo(uri) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi');
  return client;
}

async function closeMongoConnection() {
  if (client) {
    await client.close();
  }
}

module.exports = { app, connectToMongo, closeMongoConnection };  // Fixed: changed from export to module.exports

app.post('/createuser', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'Database not available' });

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({
      error: 'Missing required fields: username, email, and password are required'
    });
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
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  const username = req.body && req.body.username;
  const email = req.body && req.body.email;
  const password = req.body && req.body.password;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    //The password is ignored. Every login is successful
    const message = `Login successful for ${username}`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  connectToMongo().then(() => {
    app.listen(PORT, () => console.log(`User service listening at http://localhost:${PORT}`));
  });
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});