import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'

const now = '2026-01-01T00:00:00.000Z'

const buildTable = (overrides: Partial<Table>): Table => ({
    id: 't1',
    restaurantId: 'r1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    reservedByClientId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
})

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, `Restaurante ${id}`, 'Calle Mayor 10', 'info@r.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    describe('CRUD básico', () => {
        it('guarda y recupera una mesa por id con todos sus campos', async () => {
            const table = buildTable({ id: 'crud-1', number: 3, description: 'Junto a la ventana', capacity: 2 })
            await repo.save(table)

            expect(await repo.findById('crud-1')).toEqual(table)
        })

        it('devuelve null si la mesa no existe', async () => {
            expect(await repo.findById('no-existe')).toBeNull()
        })

        it('save actualiza la mesa existente (upsert) conservando createdAt', async () => {
            const updated = buildTable({
                id: 'crud-1',
                number: 30,
                description: null,
                capacity: 6,
                status: 'ocupada',
                updatedAt: '2026-02-01T00:00:00.000Z'
            })
            await repo.save(updated)

            expect(await repo.findById('crud-1')).toEqual(updated)
        })

        it('persiste reservedByClientId', async () => {
            const reserved = buildTable({ id: 'crud-2', number: 31, status: 'reservada', reservedByClientId: 'cliente-1' })
            await repo.save(reserved)

            expect((await repo.findById('crud-2'))?.reservedByClientId).toBe('cliente-1')

            await repo.save({ ...reserved, status: 'libre', reservedByClientId: null })
            expect((await repo.findById('crud-2'))?.reservedByClientId).toBeNull()
        })

        it('borra una mesa', async () => {
            await repo.save(buildTable({ id: 'crud-3', number: 32 }))
            await repo.delete('crud-3')

            expect(await repo.findById('crud-3')).toBeNull()
        })
    })

    describe('listados y búsqueda por número', () => {
        beforeAll(async () => {
            await repo.save(buildTable({ id: 'list-9', restaurantId: 'r2', number: 9 }))
            await repo.save(buildTable({ id: 'list-2', restaurantId: 'r2', number: 2 }))
            await repo.save(buildTable({ id: 'list-5', restaurantId: 'r2', number: 5 }))
        })

        it('lista las mesas de un restaurante ordenadas por número', async () => {
            const tables = await repo.findByRestaurantId('r2')
            expect(tables.map(t => t.number)).toEqual([2, 5, 9])
        })

        it('devuelve [] para un restaurante sin mesas', async () => {
            expect(await repo.findByRestaurantId('sin-mesas')).toEqual([])
        })

        it('findByNumber busca dentro del restaurante', async () => {
            expect((await repo.findByNumber('r2', 5))?.id).toBe('list-5')
            expect(await repo.findByNumber('r1', 5)).toBeNull()
        })
    })

    describe('disponibilidad y ocupación', () => {
        beforeAll(async () => {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                ['r3', 'Restaurante r3', 'Calle Mayor 10', 'info@r.com', '+34 612345678', 'Carlos', 'García', now, now]
            )
            await repo.save(buildTable({ id: 'av-1', restaurantId: 'r3', number: 1, capacity: 2 }))
            await repo.save(buildTable({ id: 'av-2', restaurantId: 'r3', number: 2, capacity: 6 }))
            await repo.save(buildTable({ id: 'av-3', restaurantId: 'r3', number: 3, capacity: 4 }))
            await repo.save(buildTable({ id: 'av-4', restaurantId: 'r3', number: 4, capacity: 4, status: 'ocupada' }))
            await repo.save(buildTable({ id: 'av-5', restaurantId: 'r3', number: 5, capacity: 4, status: 'reservada', reservedByClientId: 'cli-a' }))
            await repo.save(buildTable({ id: 'av-6', restaurantId: 'r3', number: 6, capacity: 8, status: 'reservada', reservedByClientId: 'cli-b' }))
            await repo.save(buildTable({ id: 'av-7', restaurantId: 'r2', number: 70, capacity: 8 }))
        })

        it('findAvailable devuelve libres con capacidad suficiente y las reservadas por el cliente, ordenadas por capacidad y número', async () => {
            const tables = await repo.findAvailable('r3', 3, 'cli-a')
            expect(tables.map(t => t.id)).toEqual(['av-3', 'av-5', 'av-2'])
        })

        it('findAvailable no devuelve reservadas por otro cliente, ocupadas ni de otro restaurante', async () => {
            const tables = await repo.findAvailable('r3', 1, 'cli-c')
            expect(tables.map(t => t.id)).toEqual(['av-1', 'av-3', 'av-2'])
        })

        it('findAvailable devuelve [] si ninguna mesa tiene capacidad suficiente', async () => {
            expect(await repo.findAvailable('r3', 20, 'cli-a')).toEqual([])
        })

        it('occupyIfFree ocupa una mesa libre y la segunda vez devuelve false', async () => {
            expect(await repo.occupyIfFree('av-1', 'r3', 'cli-c')).toBe(true)

            const occupied = await repo.findById('av-1')
            expect(occupied?.status).toBe('ocupada')
            expect(occupied?.reservedByClientId).toBeNull()
            expect(occupied?.updatedAt).not.toBe(now)

            expect(await repo.occupyIfFree('av-1', 'r3', 'cli-c')).toBe(false)
        })

        it('occupyIfFree ocupa una reservada por el mismo cliente y limpia reservedByClientId', async () => {
            expect(await repo.occupyIfFree('av-5', 'r3', 'cli-a')).toBe(true)

            const occupied = await repo.findById('av-5')
            expect(occupied?.status).toBe('ocupada')
            expect(occupied?.reservedByClientId).toBeNull()
        })

        it('occupyIfFree devuelve false sin cambios para una reservada por otro cliente', async () => {
            expect(await repo.occupyIfFree('av-6', 'r3', 'cli-a')).toBe(false)

            const table = await repo.findById('av-6')
            expect(table?.status).toBe('reservada')
            expect(table?.reservedByClientId).toBe('cli-b')
            expect(table?.updatedAt).toBe(now)
        })

        it('occupyIfFree devuelve false si la mesa es de otro restaurante o no existe', async () => {
            expect(await repo.occupyIfFree('av-7', 'r3', 'cli-a')).toBe(false)
            expect((await repo.findById('av-7'))?.status).toBe('libre')
            expect(await repo.occupyIfFree('no-existe', 'r3', 'cli-a')).toBe(false)
        })
    })
})
