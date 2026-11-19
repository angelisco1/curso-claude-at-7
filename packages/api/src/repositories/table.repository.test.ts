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
})
