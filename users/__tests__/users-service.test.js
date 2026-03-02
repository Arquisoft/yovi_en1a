import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../users-service.js'

describe('POST /createuser', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns a greeting message when username and password are given', async () => {
        const res = await request(app)
            .post('/createuser')
            .send({ username: 'Pablo', password: 'pw' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty('message')
        expect(res.body.message).toMatch(/Hello Pablo! welcome to the course!/i)
    })
})

// tests for the login endpoint
describe('POST /login', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('rejects when missing fields', async () => {
        const res = await request(app)
            .post('/login')
            .send({ username: 'Alice' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(400)
    })

    it('accepts valid credentials after user creation', async () => {
        await request(app)
            .post('/createuser')
            .send({ username: 'Bob', password: 'pw' })
        const res = await request(app)
            .post('/login')
            .send({ username: 'Bob', password: 'pw' })
            .set('Accept', 'application/json')

        expect(res.status).toBe(200)
        expect(res.body.message).toMatch(/Login successful for Bob/i)
    })

    it('fails wrong password', async () => {
        await request(app)
            .post('/createuser')
            .send({ username: 'Carl', password: '123' })
        const res = await request(app)
            .post('/login')
            .send({ username: 'Carl', password: 'wrong' })
        expect(res.status).toBe(401)
    })
})