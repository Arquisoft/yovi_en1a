import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import request from 'supertest'
import dotenv from 'dotenv'

// environment diagrams
dotenv.config({ path: '.env.test' })

const { app, connectToMongo, closeMongoConnection } = await import('../users-service.js')

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}))

describe('POST /createuser', () => {
    beforeAll(async () => {
        // Connect to the REAL test database
        await connectToMongo()
    })

    afterAll(async () => {
        // Clean up: close database connection
        await closeMongoConnection()
    })

    afterEach(async () => {
        // Clear all mocks
        vi.clearAllMocks()

        // Optional: Clear the users collection after each test
        // This ensures each test starts with a clean database
        const { MongoClient } = await import('mongodb')
        const client = new MongoClient(process.env.MONGODB_URI)
        await client.connect()
        const db = client.db('test_db')
        await db.collection('users').deleteMany({})
        await client.close()
    })

    it('returns a welcome message for the provided username', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'Pablo',
                email: 'pablo@test.com',
                password: 'secret123'
            })
            .set('Accept', 'application/json')

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Welcome Pablo! Your account was created\./i)
        expect(res.body).toHaveProperty('userId')
    })

    it('returns 409 when username already exists', async () => {
        // First create a user
        await request(app)
            .post('/createuser')
            .send({
                username: 'Pablo',
                email: 'pablo@test.com',
                password: 'secret123'
            })

        // Try to create the same user again
        const res = await request(app)
            .post('/createuser')
            .send({
                username: 'Pablo',
                email: 'pablo@test.com',
                password: 'secret123'
            })

        expect(res.status).toBe(409)
        expect(res.body).toHaveProperty('error')
        expect(res.body.error).toMatch(/Username or email already exists/i)
    })
})