import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../users-service.js'

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