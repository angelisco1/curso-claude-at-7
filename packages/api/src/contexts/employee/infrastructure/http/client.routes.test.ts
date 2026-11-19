import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../../../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

const tokenFor = (role: string) => `Bearer ${jwt.sign({ id: `${role}-token`, role, restaurantId: null }, JWT_SECRET)}`

describe('GET /api/v1/clients', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        const employees = [
            ['camarero-1', 'Ana', 'Abad', 'camarero'],
            ['cliente-2', 'Pablo', 'Ruiz', 'cliente'],
            ['cliente-1', 'Laura', 'Gómez', 'cliente']
        ]
        for (const [id, firstName, lastName, role] of employees) {
            await dbConfig.run(
                'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, firstName, lastName, `${id}@resttek.com`, 'hash', role, null]
            )
        }
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it.each([['admin'], ['manager'], ['camarero']])('devuelve los clientes sin passwordHash como %s', async (role) => {
        const res = await request(app).get('/api/v1/clients').set('Authorization', tokenFor(role))

        expect(res.status).toBe(200)
        expect(res.body).toEqual([
            { id: 'cliente-1', firstName: 'Laura', lastName: 'Gómez', email: 'cliente-1@resttek.com' },
            { id: 'cliente-2', firstName: 'Pablo', lastName: 'Ruiz', email: 'cliente-2@resttek.com' }
        ])
    })

    it.each([['cocinero'], ['cliente']])('responde 403 como %s', async (role) => {
        const res = await request(app).get('/api/v1/clients').set('Authorization', tokenFor(role))

        expect(res.status).toBe(403)
        expect(res.body.message).toBeUndefined()
    })

    it('responde 401 sin token', async () => {
        const res = await request(app).get('/api/v1/clients')
        expect(res.status).toBe(401)
    })
})
