import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../app.js'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'
const now = '2026-01-01T00:00:00.000Z'

const tokenFor = (role: string, id = `${role}-1`, restaurantId: string | null = 'r1') =>
    `Bearer ${jwt.sign({ id, role, restaurantId }, JWT_SECRET)}`

const admin = tokenFor('admin', 'admin-1', null)
const manager = tokenFor('manager')
const camarero = tokenFor('camarero')
const cocinero = tokenFor('cocinero')
const cliente = tokenFor('cliente', 'cliente-1', null)

const base = (restaurantId = 'r1') => `/api/v1/restaurants/${restaurantId}/tables`

const insertTable = async (props: { id: string, restaurantId?: string, number: number, capacity?: number, status?: string, reservedByClientId?: string | null }) => {
    await dbConfig.run(
        'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, reserved_by_client_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [props.id, props.restaurantId ?? 'r1', props.number, null, props.capacity ?? 4, props.status ?? 'libre', props.reservedByClientId ?? null, now, now]
    )
}

describe('Rutas de mesas', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        for (const id of ['r1', 'r2']) {
            await dbConfig.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', 'info@r.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
        for (const [id, role] of [['cliente-1', 'cliente'], ['cliente-2', 'cliente'], ['camarero-1', 'camarero']]) {
            await dbConfig.run(
                'INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [id, 'Nombre', 'Apellido', `${id}@resttek.com`, 'hash', role, null]
            )
        }
    })

    beforeEach(async () => {
        await dbConfig.run('DELETE FROM tables')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    describe('autenticación', () => {
        it('responde 401 sin token, con cuerpo { error } sin message', async () => {
            const res = await request(app).get(base())

            expect(res.status).toBe(401)
            expect(res.body.error).toEqual(expect.any(String))
            expect(res.body.message).toBeUndefined()
        })
    })

    describe('POST /', () => {
        it('crea una mesa como admin (201) con la forma exacta de Table', async () => {
            const res = await request(app).post(base()).set('Authorization', admin)
                .send({ number: 1, capacity: 4, description: '  Terraza  ' })

            expect(res.status).toBe(201)
            expect(Object.keys(res.body).sort()).toEqual(
                ['capacity', 'createdAt', 'description', 'id', 'number', 'reservedByClientId', 'restaurantId', 'status', 'updatedAt']
            )
            expect(res.body).toMatchObject({
                restaurantId: 'r1',
                number: 1,
                capacity: 4,
                description: 'Terraza',
                status: 'libre',
                reservedByClientId: null
            })
        })

        it('crea una mesa reservada para un cliente', async () => {
            const res = await request(app).post(base()).set('Authorization', admin)
                .send({ number: 2, capacity: 4, status: 'reservada', reservedByClientId: 'cliente-1' })

            expect(res.status).toBe(201)
            expect(res.body.reservedByClientId).toBe('cliente-1')
        })

        it.each([['camarero', camarero], ['manager', manager], ['cliente', cliente]])(
            'responde 403 como %s, con cuerpo { error } sin message',
            async (_rol, token) => {
                const res = await request(app).post(base()).set('Authorization', token).send({ number: 1, capacity: 4 })

                expect(res.status).toBe(403)
                expect(res.body.error).toEqual(expect.any(String))
                expect(res.body.message).toBeUndefined()
            }
        )

        it('responde 400 InvalidTableNumberError sin cuerpo', async () => {
            const res = await request(app).post(base()).set('Authorization', admin)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidTableNumberError', message: 'El número de mesa debe ser un entero mayor que 0' })
        })

        it('responde 400 InvalidTableCapacityError si la capacidad es un string', async () => {
            const res = await request(app).post(base()).set('Authorization', admin).send({ number: 1, capacity: '4' })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidTableCapacityError', message: 'La capacidad debe ser un entero mayor que 0' })
        })

        it('responde 400 DuplicatedTableNumberError con un número repetido', async () => {
            await insertTable({ id: 't1', number: 1 })

            const res = await request(app).post(base()).set('Authorization', admin).send({ number: 1, capacity: 4 })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con ese número en este restaurante' })
        })

        it('responde 400 InvalidReservationClientError si reserva sin cliente', async () => {
            const res = await request(app).post(base()).set('Authorization', admin).send({ number: 1, capacity: 4, status: 'reservada' })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidReservationClientError', message: 'Una mesa reservada necesita un cliente válido' })
        })
    })

    describe('GET /', () => {
        beforeEach(async () => {
            await insertTable({ id: 't3', number: 3 })
            await insertTable({ id: 't1', number: 1 })
            await insertTable({ id: 'otro', restaurantId: 'r2', number: 2 })
        })

        it.each([['admin', admin], ['manager', manager], ['camarero', camarero]])(
            'lista las mesas del restaurante ordenadas por número como %s',
            async (_rol, token) => {
                const res = await request(app).get(base()).set('Authorization', token)

                expect(res.status).toBe(200)
                expect(res.body.map((t: { id: string }) => t.id)).toEqual(['t1', 't3'])
            }
        )

        it.each([['cocinero', cocinero], ['cliente', cliente]])('responde 403 como %s', async (_rol, token) => {
            const res = await request(app).get(base()).set('Authorization', token)
            expect(res.status).toBe(403)
        })
    })

    describe('GET /:id', () => {
        it('devuelve la mesa', async () => {
            await insertTable({ id: 't1', number: 1 })

            const res = await request(app).get(`${base()}/t1`).set('Authorization', camarero)

            expect(res.status).toBe(200)
            expect(res.body.id).toBe('t1')
        })

        it('responde 404 TableNotFoundError si no existe', async () => {
            const res = await request(app).get(`${base()}/no-existe`).set('Authorization', admin)

            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
        })

        it('responde 404 si la mesa es de otro restaurante', async () => {
            await insertTable({ id: 'otro', restaurantId: 'r2', number: 1 })

            const res = await request(app).get(`${base('r1')}/otro`).set('Authorization', admin)

            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })

        it('responde 403 como cocinero', async () => {
            const res = await request(app).get(`${base()}/t1`).set('Authorization', cocinero)
            expect(res.status).toBe(403)
        })
    })

    describe('PUT /:id', () => {
        beforeEach(async () => {
            await insertTable({ id: 't1', number: 1 })
        })

        it('actualiza la mesa como admin (200), aceptando su propio número', async () => {
            const res = await request(app).put(`${base()}/t1`).set('Authorization', admin)
                .send({ number: 1, capacity: 6, status: 'reservada', description: null, reservedByClientId: 'cliente-2' })

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: 't1', number: 1, capacity: 6, status: 'reservada', description: null, reservedByClientId: 'cliente-2', createdAt: now })
        })

        it('responde 404 si la mesa es de otro restaurante', async () => {
            const res = await request(app).put(`${base('r2')}/t1`).set('Authorization', admin)
                .send({ number: 1, capacity: 4, status: 'libre', description: null, reservedByClientId: null })

            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })

        it('responde 400 InvalidTableStatusError sin estado', async () => {
            const res = await request(app).put(`${base()}/t1`).set('Authorization', admin).send({ number: 1, capacity: 4 })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidTableStatusError', message: 'Estado de mesa inválido. Debe ser libre, ocupada o reservada' })
        })

        it('responde 403 como manager', async () => {
            const res = await request(app).put(`${base()}/t1`).set('Authorization', manager)
                .send({ number: 1, capacity: 4, status: 'libre' })
            expect(res.status).toBe(403)
        })
    })

    describe('DELETE /:id', () => {
        it('borra la mesa como admin (204)', async () => {
            await insertTable({ id: 't1', number: 1, status: 'reservada', reservedByClientId: 'cliente-1' })

            const res = await request(app).delete(`${base()}/t1`).set('Authorization', admin)

            expect(res.status).toBe(204)
            expect(await dbConfig.get('SELECT id FROM tables WHERE id = ?', ['t1'])).toBeUndefined()
        })

        it('responde 400 TableOccupiedError con una mesa ocupada', async () => {
            await insertTable({ id: 't1', number: 1, status: 'ocupada' })

            const res = await request(app).delete(`${base()}/t1`).set('Authorization', admin)

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'TableOccupiedError', message: 'No se puede eliminar una mesa ocupada' })
        })

        it('responde 404 si no existe o es de otro restaurante', async () => {
            await insertTable({ id: 'otro', restaurantId: 'r2', number: 1 })

            expect((await request(app).delete(`${base()}/no-existe`).set('Authorization', admin)).status).toBe(404)
            expect((await request(app).delete(`${base('r1')}/otro`).set('Authorization', admin)).status).toBe(404)
        })

        it('responde 403 como camarero', async () => {
            await insertTable({ id: 't1', number: 1 })

            const res = await request(app).delete(`${base()}/t1`).set('Authorization', camarero)
            expect(res.status).toBe(403)
        })
    })
    describe('PATCH /:id/status', () => {
        beforeEach(async () => {
            await insertTable({ id: 't1', number: 1 })
        })

        it.each([['admin', admin], ['manager', manager], ['camarero', camarero]])('cambia el estado como %s (200)', async (_rol, token) => {
            const res = await request(app).patch(`${base()}/t1/status`).set('Authorization', token).send({ status: 'ocupada' })

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: 't1', status: 'ocupada', reservedByClientId: null })
        })

        it('reserva para un cliente y libera limpiando el cliente', async () => {
            const reserved = await request(app).patch(`${base()}/t1/status`).set('Authorization', camarero)
                .send({ status: 'reservada', reservedByClientId: 'cliente-1' })
            expect(reserved.status).toBe(200)
            expect(reserved.body.reservedByClientId).toBe('cliente-1')

            const freed = await request(app).patch(`${base()}/t1/status`).set('Authorization', camarero).send({ status: 'libre' })
            expect(freed.status).toBe(200)
            expect(freed.body.reservedByClientId).toBeNull()
        })

        it.each([['cliente', cliente], ['cocinero', cocinero]])('responde 403 como %s', async (_rol, token) => {
            const res = await request(app).patch(`${base()}/t1/status`).set('Authorization', token).send({ status: 'ocupada' })
            expect(res.status).toBe(403)
        })

        it('responde 400 InvalidTableStatusError con un estado inválido o sin cuerpo', async () => {
            const invalid = await request(app).patch(`${base()}/t1/status`).set('Authorization', camarero).send({ status: 'rota' })
            expect(invalid.status).toBe(400)
            expect(invalid.body).toEqual({ error: 'InvalidTableStatusError', message: 'Estado de mesa inválido. Debe ser libre, ocupada o reservada' })

            const empty = await request(app).patch(`${base()}/t1/status`).set('Authorization', camarero)
            expect(empty.status).toBe(400)
            expect(empty.body.error).toBe('InvalidTableStatusError')
        })

        it('responde 400 InvalidReservationClientError si reserva sin cliente', async () => {
            const res = await request(app).patch(`${base()}/t1/status`).set('Authorization', camarero).send({ status: 'reservada' })

            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: 'InvalidReservationClientError', message: 'Una mesa reservada necesita un cliente válido' })
        })

        it('responde 404 si la mesa es de otro restaurante', async () => {
            const res = await request(app).patch(`${base('r2')}/t1/status`).set('Authorization', camarero).send({ status: 'ocupada' })

            expect(res.status).toBe(404)
            expect(res.body.error).toBe('TableNotFoundError')
        })
    })

    describe('GET /available', () => {
        beforeEach(async () => {
            await insertTable({ id: 'pequena', number: 1, capacity: 2 })
            await insertTable({ id: 'grande', number: 2, capacity: 6 })
            await insertTable({ id: 'mediana', number: 3, capacity: 4 })
            await insertTable({ id: 'ocupada', number: 4, capacity: 4, status: 'ocupada' })
            await insertTable({ id: 'mia', number: 5, capacity: 4, status: 'reservada', reservedByClientId: 'cliente-1' })
            await insertTable({ id: 'ajena', number: 6, capacity: 8, status: 'reservada', reservedByClientId: 'cliente-2' })
            await insertTable({ id: 'otro-rest', restaurantId: 'r2', number: 1, capacity: 8 })
        })

        it('devuelve al cliente las libres con capacidad suficiente y sus reservadas, ordenadas por capacidad y número', async () => {
            const res = await request(app).get(`${base()}/available?people=3`).set('Authorization', cliente)

            expect(res.status).toBe(200)
            expect(res.body.map((t: { id: string }) => t.id)).toEqual(['mediana', 'mia', 'grande'])
            expect(res.body[0]).toMatchObject({ restaurantId: 'r1', number: 3, capacity: 4, status: 'libre' })
        })

        it('está disponible para cualquier rol autenticado', async () => {
            const res = await request(app).get(`${base()}/available?people=1`).set('Authorization', cocinero)

            expect(res.status).toBe(200)
            expect(res.body.map((t: { id: string }) => t.id)).toEqual(['pequena', 'mediana', 'grande'])
        })

        it('devuelve [] si no hay mesas con capacidad suficiente', async () => {
            const res = await request(app).get(`${base()}/available?people=20`).set('Authorization', cliente)

            expect(res.status).toBe(200)
            expect(res.body).toEqual([])
        })

        it.each([[''], ['?people='], ['?people=0'], ['?people=-1'], ['?people=2.5'], ['?people=abc'], ['?people=2&people=3']])(
            'responde 400 InvalidPeopleCountError con %o',
            async (query) => {
                const res = await request(app).get(`${base()}/available${query}`).set('Authorization', cliente)

                expect(res.status).toBe(400)
                expect(res.body).toEqual({ error: 'InvalidPeopleCountError', message: 'El número de personas debe ser un entero mayor que 0' })
            }
        )

        it('responde 401 sin token', async () => {
            const res = await request(app).get(`${base()}/available?people=2`)
            expect(res.status).toBe(401)
        })
    })

    describe('POST /:id/occupy', () => {
        beforeEach(async () => {
            await insertTable({ id: 'libre', number: 1 })
            await insertTable({ id: 'mia', number: 2, status: 'reservada', reservedByClientId: 'cliente-1' })
            await insertTable({ id: 'ajena', number: 3, status: 'reservada', reservedByClientId: 'cliente-2' })
            await insertTable({ id: 'otro-rest', restaurantId: 'r2', number: 1 })
        })

        it('ocupa una mesa libre (200) y la segunda vez responde 400 TableNotAvailableError', async () => {
            const first = await request(app).post(`${base()}/libre/occupy`).set('Authorization', cliente)
            expect(first.status).toBe(200)
            expect(first.body).toMatchObject({ id: 'libre', status: 'ocupada', reservedByClientId: null })

            const second = await request(app).post(`${base()}/libre/occupy`).set('Authorization', cliente)
            expect(second.status).toBe(400)
            expect(second.body).toEqual({ error: 'TableNotAvailableError', message: 'La mesa ya no está disponible' })
        })

        it('ocupa una mesa reservada por el propio cliente', async () => {
            const res = await request(app).post(`${base()}/mia/occupy`).set('Authorization', cliente)

            expect(res.status).toBe(200)
            expect(res.body).toMatchObject({ id: 'mia', status: 'ocupada', reservedByClientId: null })
        })

        it('responde 400 TableNotAvailableError con una reservada por otro cliente', async () => {
            const res = await request(app).post(`${base()}/ajena/occupy`).set('Authorization', cliente)

            expect(res.status).toBe(400)
            expect(res.body.error).toBe('TableNotAvailableError')
        })

        it('responde 404 si no existe o es de otro restaurante, sin ocuparla', async () => {
            expect((await request(app).post(`${base()}/no-existe/occupy`).set('Authorization', cliente)).status).toBe(404)

            const res = await request(app).post(`${base('r1')}/otro-rest/occupy`).set('Authorization', cliente)
            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: 'TableNotFoundError', message: 'Mesa no encontrada' })
            expect(await dbConfig.get('SELECT status FROM tables WHERE id = ?', ['otro-rest'])).toEqual({ status: 'libre' })
        })

        it.each([['admin', admin], ['camarero', camarero]])('responde 403 como %s', async (_rol, token) => {
            const res = await request(app).post(`${base()}/libre/occupy`).set('Authorization', token)
            expect(res.status).toBe(403)
        })
    })
})
