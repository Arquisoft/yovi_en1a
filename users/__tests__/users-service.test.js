import { describe, it, expect, beforeAll, afterAll, beforeEach} from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, connectToMongo, closeMongoConnection } from '../users-service.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectToMongo(uri);
});//

afterAll(async () => {
    await closeMongoConnection();
    await mongoServer.stop();
});

beforeEach(async () => {
    // Clear users collection between tests to ensure isolation
    const { MongoClient } = await import('mongodb');
    const uri = mongoServer.getUri();
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('test_db');
    await db.collection('users').deleteMany({});
    await client.close();
});

describe('POST /createuser', () => {
    const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'securepassword123',
    };

    it('should create a new user and return 201 with a welcome message', async () => {
        const res = await request(app).post('/createuser').send(validUser);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe(`Welcome ${validUser.username}! Your account was created.`);
        expect(res.body.userId).toBeDefined();
    });

    it('should store a hashed password, not the plain text password', async () => {
        const { MongoClient } = await import('mongodb');
        const { default: bcrypt } = await import('bcrypt');

        await request(app).post('/createuser').send(validUser);

        const uri = mongoServer.getUri();
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('test_db');
        const user = await db.collection('users').findOne({ username: validUser.username });
        await client.close();

        expect(user).not.toBeNull();
        expect(user.password).not.toBe(validUser.password);
        const isMatch = await bcrypt.compare(validUser.password, user.password);
        expect(isMatch).toBe(true);
    });

    it('should store a createdAt timestamp', async () => {
        const { MongoClient } = await import('mongodb');

        await request(app).post('/createuser').send(validUser);

        const uri = mongoServer.getUri();
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('test_db');
        const user = await db.collection('users').findOne({ username: validUser.username });
        await client.close();

        expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should return 409 when username or email already exists', async () => {

        await request(app).post('/createuser').send(validUser);

        const { MongoClient } = await import('mongodb');
        const uri = mongoServer.getUri();
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('test_db');
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await client.close();

        const res = await request(app).post('/createuser').send(validUser);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Username or email already exists');
    });

    it('should return 500 when required fields are missing', async () => {
        const res = await request(app).post('/createuser').send({
            username: 'nopassword',
            email: 'nopass@example.com',
            // missing password
        });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Internal server error');
    });

    it('should return 500 when the database is not available', async () => {
        // Temporarily break the db by closing connection
        await closeMongoConnection();

        const res = await request(app).post('/createuser').send(validUser);

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/Database not available|Internal server error/);

        // Reconnect for next tests
        const uri = mongoServer.getUri();
        await connectToMongo(uri);
    });

    it('should return correct JSON shape on success', async () => {
        const res = await request(app).post('/createuser').send(validUser);

        expect(res.headers['content-type']).toMatch(/json/);
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('userId');
        expect(typeof res.body.message).toBe('string');
    });
});
