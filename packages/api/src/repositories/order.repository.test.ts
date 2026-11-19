import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { Database } from '@config/database.js'

const now = '2026-01-01T00:00:00.000Z'

describe('SqliteOrderRepository: número de mesa (Integration)', () => {
    let db: Database
    let repo: SqliteOrderRepository

    const insertOrder = async (id: string, restaurantId: string, tableId: string | null, createdAt: string) => {
        await db.run(
            'INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, restaurantId, tableId, 'cliente-1', createdAt]
        )
        await db.run(
            'INSERT INTO order_items (id, order_id, dish_id, quantity, notes, status) VALUES (?, ?, ?, ?, ?, ?)',
            [`${id}-item`, id, 'd1', 1, null, 'pendiente']
        )
    }

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteOrderRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', 'info@r.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
        await db.run(
            'INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['d1', 'Paella', null, 12, 'principal', 1, 'r1', now, now]
        )
        for (const [id, restaurantId, number] of [['mesa-7', 'r1', 7], ['mesa-r2', 'r2', 3]] as const) {
            await db.run(
                'INSERT INTO tables (id, restaurant_id, number, description, capacity, status, reserved_by_client_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, restaurantId, number, null, 4, 'ocupada', null, now, now]
            )
        }

        await insertOrder('con-mesa', 'r1', 'mesa-7', '2026-01-01T10:00:00.000Z')
        await insertOrder('sin-mesa', 'r1', null, '2026-01-01T11:00:00.000Z')
        await insertOrder('antiguo', 'r1', '5', '2026-01-01T12:00:00.000Z')
        await insertOrder('mesa-ajena', 'r1', 'mesa-r2', '2026-01-01T13:00:00.000Z')
    })

    afterAll(async () => {
        await db.close()
    })

    it('findById incluye tableNumber de la mesa del pedido', async () => {
        const order = await repo.findById('con-mesa')
        expect(order?.tableNumber).toBe(7)
        expect(order?.tableId).toBe('mesa-7')
    })

    it('findById devuelve tableNumber null sin mesa, con un tableId antiguo o con una mesa de otro restaurante', async () => {
        expect((await repo.findById('sin-mesa'))?.tableNumber).toBeNull()
        expect((await repo.findById('antiguo'))?.tableNumber).toBeNull()
        expect((await repo.findById('mesa-ajena'))?.tableNumber).toBeNull()
    })

    it('findActiveByRestaurant incluye tableNumber', async () => {
        const orders = await repo.findActiveByRestaurant('r1')
        expect(orders.map(o => [o.id, o.tableNumber])).toEqual([
            ['con-mesa', 7],
            ['sin-mesa', null],
            ['antiguo', null],
            ['mesa-ajena', null]
        ])
    })

    it('findByClientId incluye tableNumber', async () => {
        const orders = await repo.findByClientId('cliente-1')
        expect(orders.map(o => [o.id, o.tableNumber])).toEqual([
            ['mesa-ajena', null],
            ['antiguo', null],
            ['sin-mesa', null],
            ['con-mesa', 7]
        ])
    })
})
