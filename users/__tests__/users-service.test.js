vi.mock('bcrypt', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, hash: actual.hash };
});

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, connectToMongo, closeMongoConnection } from '../users-service.js';

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectToMongo(uri);

    // Create unique indexes so duplicate detection works in tests
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('test_db');
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await client.close();
});

afterAll(async () => {
    await closeMongoConnection();
    await mongoServer.stop();
});

beforeEach(async () => {
    const { MongoClient } = await import('mongodb');
    const uri = mongoServer.getUri();
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('test_db');
    await db.collection('users').deleteMany({});
    await client.close();
});

describe('POST /createuser', () => {
    afterEach(() => vi.restoreAllMocks());

    it('returns a greeting message for the provided username', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo', email: 'pablo@example.com', password: 'secret123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i);
        expect(res.body).toHaveProperty('userId');
    });

    it('returns 400 when username is missing', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ email: 'pablo@example.com', password: 'secret123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo', password: 'secret123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 400 when password is missing', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo', email: 'pablo@example.com' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/missing required fields/i);
    });

    it('returns 409 when username or email already exists', async () => {
        const user = { username: 'Pablo', email: 'pablo@example.com', password: 'secret123' };

        await request(app).post('/createuser').send(user);
        const res = await request(app).post('/createuser').send(user);

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/already exists/i);
    });

    it('returns 500 when the database throws an unexpected error', async () => {
        const bcrypt = await import('bcrypt');
        bcrypt.hash = vi.fn().mockRejectedValueOnce(new Error('hash failure'));

        const res = await request(app)
            .post('/createuser')
            .send({ username: 'ErrorUser', email: 'err@example.com', password: 'secret123' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(500);
        expect(res.body.error).toMatch(/internal server error/i);

        // Restore original
        const { hash } = await vi.importActual('bcrypt');
        bcrypt.hash = hash;
    });
});

describe('POST /login', () => {
    afterEach(() => vi.restoreAllMocks());

    it('returns a success message regardless of password', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'Alice', email: 'a@example.com', password: 'secret' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toMatch(/Login successful for Alice/i);
    });

    it('returns a success message with no password provided', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'Bob', email: 'bob@example.com' })
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Login successful for Bob/i);
    });

    it('handles login with no body gracefully', async () => {
        const res = await request(app)
            .post('/login')
            .set('Accept', 'application/json');

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/Login successful for undefined/i);
    });
});

describe('CORS headers', () => {
    it('allows requests from a permitted origin', async () => {
        const res = await request(app)
            .post('/login')
            .set('Origin', 'http://localhost:3000')
            .send({ username: 'Alice', password: 'secret' });

        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('blocks requests from an unknown origin', async () => {
        const res = await request(app)
            .post('/login')
            .set('Origin', 'http://evil.com')
            .send({ username: 'Alice', password: 'secret' });

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});