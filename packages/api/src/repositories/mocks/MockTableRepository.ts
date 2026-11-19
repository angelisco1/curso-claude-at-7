import type { TableRepository } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .sort((a, b) => a.number - b.number)
    }

    async findByNumber(restaurantId: string, number: number): Promise<Table | null> {
        return Array.from(this.tables.values())
            .find(t => t.restaurantId === restaurantId && t.number === number) ?? null
    }

    async findAvailable(restaurantId: string, people: number, clientId: string): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId && t.capacity >= people)
            .filter(t => this.isOccupiableBy(t, clientId))
            .sort((a, b) => a.capacity - b.capacity || a.number - b.number)
    }

    async occupyIfFree(id: string, restaurantId: string, clientId: string): Promise<boolean> {
        const table = this.tables.get(id)
        if (!table || table.restaurantId !== restaurantId || !this.isOccupiableBy(table, clientId)) {
            return false
        }
        this.tables.set(id, {
            ...table,
            status: 'ocupada',
            reservedByClientId: null,
            updatedAt: new Date().toISOString()
        })
        return true
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, table)
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    private isOccupiableBy(table: Table, clientId: string): boolean {
        return table.status === 'libre' || (table.status === 'reservada' && table.reservedByClientId === clientId)
    }
}
