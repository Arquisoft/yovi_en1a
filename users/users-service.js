const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
import cors from 'cors';



const app = express();
const PORT = 3000;

app.use(express.json());

let db, client;

export async function connectToMongo(uri) {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.NODE_ENV === 'test' ? 'test_db' : 'yovi');
  return client;
}

export async function closeMongoConnection() {
  if (client) {
    await client.close();
  }
}

export { app };

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
      message: `Hello ${username}! Welcome to the course!`,
      userId: result.insertedId
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
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

app.use(cors({
  origin: '*',
  credentials: true
}));