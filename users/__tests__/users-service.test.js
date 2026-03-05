import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import request from 'supertest'
import dotenv from 'dotenv'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

dotenv.config({ path: '.env.test' })

const { app, connectToMongo, closeMongoConnection } = await import('../users-service.js')

vi.mock('bcrypt', () => ({
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password')
    }
}))

describe('POST /createuser', () => {
    let mongoServer
    let mongoUri

    beforeAll(async () => {
        // Start in-memory MongoDB server
        mongoServer = await MongoMemoryServer.create()
        mongoUri = mongoServer.getUri()

        // Override the MongoDB URI for tests
        process.env.MONGODB_URI = mongoUri

        // Connect to the in-memory database
        await connectToMongo()
    })

    afterAll(async () => {
        // Clean up: close database connection
        await closeMongoConnection()
        // Stop in-memory MongoDB server
        await mongoServer.stop()
    })

    afterEach(async () => {
        // Clear all mocks
        vi.clearAllMocks()

        // Clear the users collection after each test
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