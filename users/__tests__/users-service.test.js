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
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns a greeting message for the provided username', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i)
    })
})

// tests for the login endpoint
describe('POST /login', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns a success message regardless of password', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'Alice', email: 'a@example.com', password: 'secret' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Login successful for Alice/i)
        expect(res.headers['access-control-allow-origin']).toBe('*')
    })
})
