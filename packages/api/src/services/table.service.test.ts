import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from '@services/table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockEmployeeRepository } from '@employee/application/mocks/MockDependencies.js'
import { Employee } from '@employee/domain/Employee.js'
import type { Table } from '@models/table.model.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    InvalidReservationClientError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

const buildEmployee = (id: string, role: string) => Employee.create({
    id,
    firstName: 'Laura',
    lastName: 'Gómez',
    email: `${id}@resttek.com`,
    passwordHash: 'hash',
    role,
    restaurantId: null
})

describe('TableService', () => {
    let tableRepository: MockTableRepository
    let employeeRepository: MockEmployeeRepository
    let service: TableService

    beforeEach(async () => {
        tableRepository = new MockTableRepository()
        employeeRepository = new MockEmployeeRepository()
        service = new TableService(tableRepository, employeeRepository)

        await employeeRepository.save(buildEmployee('cliente-1', 'cliente'))
        await employeeRepository.save(buildEmployee('camarero-1', 'camarero'))
    })

    describe('create', () => {
        it('genera id y fechas, con libre, description null y reservedByClientId null por defecto', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })

            expect(table.id).toEqual(expect.any(String))
            expect(table.id).not.toBe('')
            expect(table).toMatchObject({
                restaurantId: 'r1',
                number: 1,
                capacity: 4,
                status: 'libre',
                description: null,
                reservedByClientId: null
            })
            expect(new Date(table.createdAt).toISOString()).toBe(table.createdAt)
            expect(table.updatedAt).toBe(table.createdAt)
            expect(await tableRepository.findById(table.id)).toEqual(table)
        })

        it('recorta la descripción y normaliza el estado', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 2, capacity: 2, description: '  Terraza  ', status: ' OCUPADA ' })

            expect(table.description).toBe('Terraza')
            expect(table.status).toBe('ocupada')
        })

        it.each([[''], ['   '], [null], [undefined]])('guarda description %o como null', async (description) => {
            const table = await service.create({ restaurantId: 'r1', number: 3, capacity: 2, description })
            expect(table.description).toBeNull()
        })

        it.each([['3'], [0], [-1], [1.5], [null], [undefined], [Number.NaN]])('rechaza el número %o', async (number) => {
            await expect(service.create({ restaurantId: 'r1', number, capacity: 4 }))
                .rejects.toThrow(InvalidTableNumberError)
        })

        it.each([['4'], [0], [-2], [2.5], [null], [undefined]])('rechaza la capacidad %o', async (capacity) => {
            await expect(service.create({ restaurantId: 'r1', number: 1, capacity }))
                .rejects.toThrow(InvalidTableCapacityError)
        })

        it.each([['rota'], [''], [5]])('rechaza el estado %o', async (status) => {
            await expect(service.create({ restaurantId: 'r1', number: 1, capacity: 4, status }))
                .rejects.toThrow(InvalidTableStatusError)
        })

        it('rechaza un número repetido en el mismo restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 7, capacity: 4 })

            await expect(service.create({ restaurantId: 'r1', number: 7, capacity: 2 }))
                .rejects.toThrow(DuplicatedTableNumberError)
        })

        it('permite el mismo número en otro restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 7, capacity: 4 })

            const table = await service.create({ restaurantId: 'r2', number: 7, capacity: 4 })
            expect(table.number).toBe(7)
        })

        it('crea una mesa reservada para un cliente existente', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 8, capacity: 4, status: 'reservada', reservedByClientId: 'cliente-1' })

            expect(table.status).toBe('reservada')
            expect(table.reservedByClientId).toBe('cliente-1')
        })

        it.each([
            ['sin cliente', undefined],
            ['con cliente null', null],
            ['con cliente vacío', ''],
            ['con un cliente que no existe', 'no-existe'],
            ['con un empleado que no es cliente', 'camarero-1']
        ])('rechaza una reservada %s', async (_caso, reservedByClientId) => {
            await expect(service.create({ restaurantId: 'r1', number: 9, capacity: 4, status: 'reservada', reservedByClientId }))
                .rejects.toThrow(InvalidReservationClientError)
        })

        it.each([['libre'], ['ocupada'], [undefined]])('rechaza un cliente con estado %o', async (status) => {
            await expect(service.create({ restaurantId: 'r1', number: 10, capacity: 4, status, reservedByClientId: 'cliente-1' }))
                .rejects.toThrow(InvalidReservationClientError)
        })

        it('acepta reservedByClientId null con estado libre', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 11, capacity: 4, status: 'libre', reservedByClientId: null })
            expect(table.reservedByClientId).toBeNull()
        })
    })
    describe('consulta', () => {
        it('findByRestaurantId devuelve solo las mesas del restaurante ordenadas por número', async () => {
            await service.create({ restaurantId: 'r1', number: 5, capacity: 4 })
            await service.create({ restaurantId: 'r1', number: 2, capacity: 4 })
            await service.create({ restaurantId: 'r2', number: 1, capacity: 4 })

            const tables = await service.findByRestaurantId('r1')
            expect(tables.map(t => t.number)).toEqual([2, 5])
        })

        it('findById devuelve la mesa del restaurante', async () => {
            const created = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })
            expect(await service.findById('r1', created.id)).toEqual(created)
        })

        it('findById lanza TableNotFoundError si no existe', async () => {
            await expect(service.findById('r1', 'no-existe')).rejects.toThrow(TableNotFoundError)
        })

        it('findById lanza TableNotFoundError si la mesa es de otro restaurante', async () => {
            const created = await service.create({ restaurantId: 'r2', number: 1, capacity: 4 })
            await expect(service.findById('r1', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('update', () => {
        let original: Table

        beforeEach(async () => {
            original = await service.create({ restaurantId: 'r1', number: 1, capacity: 4, description: 'Terraza' })
            await new Promise(resolve => setTimeout(resolve, 2))
        })

        it('actualiza los campos, conserva id, restaurante y createdAt, y renueva updatedAt', async () => {
            const updated = await service.update('r1', original.id, {
                number: 1,
                capacity: 6,
                description: '  Salón  ',
                status: 'reservada',
                reservedByClientId: 'cliente-1'
            })

            expect(updated).toMatchObject({
                id: original.id,
                restaurantId: 'r1',
                number: 1,
                capacity: 6,
                description: 'Salón',
                status: 'reservada',
                reservedByClientId: 'cliente-1',
                createdAt: original.createdAt
            })
            expect(updated.updatedAt > original.updatedAt).toBe(true)
            expect(await tableRepository.findById(original.id)).toEqual(updated)
        })

        it('trata description y reservedByClientId ausentes como null', async () => {
            const updated = await service.update('r1', original.id, { number: 1, capacity: 4, status: 'libre' })

            expect(updated.description).toBeNull()
            expect(updated.reservedByClientId).toBeNull()
        })

        it('valida igual que create', async () => {
            await expect(service.update('r1', original.id, { number: 0, capacity: 4, status: 'libre' }))
                .rejects.toThrow(InvalidTableNumberError)
            await expect(service.update('r1', original.id, { number: 1, capacity: '4', status: 'libre' }))
                .rejects.toThrow(InvalidTableCapacityError)
            await expect(service.update('r1', original.id, { number: 1, capacity: 4 }))
                .rejects.toThrow(InvalidTableStatusError)
            await expect(service.update('r1', original.id, { number: 1, capacity: 4, status: 'reservada' }))
                .rejects.toThrow(InvalidReservationClientError)
            await expect(service.update('r1', original.id, { number: 1, capacity: 4, status: 'ocupada', reservedByClientId: 'cliente-1' }))
                .rejects.toThrow(InvalidReservationClientError)
        })

        it('rechaza el número de otra mesa del mismo restaurante', async () => {
            await service.create({ restaurantId: 'r1', number: 2, capacity: 4 })

            await expect(service.update('r1', original.id, { number: 2, capacity: 4, status: 'libre' }))
                .rejects.toThrow(DuplicatedTableNumberError)
        })

        it('lanza TableNotFoundError si no existe o es de otro restaurante', async () => {
            await expect(service.update('r1', 'no-existe', { number: 1, capacity: 4, status: 'libre' }))
                .rejects.toThrow(TableNotFoundError)
            await expect(service.update('r2', original.id, { number: 1, capacity: 4, status: 'libre' }))
                .rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('borra una mesa libre', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4 })
            await service.delete('r1', table.id)

            expect(await tableRepository.findById(table.id)).toBeNull()
        })

        it('borra una mesa reservada', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4, status: 'reservada', reservedByClientId: 'cliente-1' })
            await service.delete('r1', table.id)

            expect(await tableRepository.findById(table.id)).toBeNull()
        })

        it('lanza TableOccupiedError y no borra una mesa ocupada', async () => {
            const table = await service.create({ restaurantId: 'r1', number: 1, capacity: 4, status: 'ocupada' })

            await expect(service.delete('r1', table.id)).rejects.toThrow(TableOccupiedError)
            expect(await tableRepository.findById(table.id)).not.toBeNull()
        })

        it('lanza TableNotFoundError si no existe o es de otro restaurante', async () => {
            const table = await service.create({ restaurantId: 'r2', number: 1, capacity: 4 })

            await expect(service.delete('r1', 'no-existe')).rejects.toThrow(TableNotFoundError)
            await expect(service.delete('r1', table.id)).rejects.toThrow(TableNotFoundError)
            expect(await tableRepository.findById(table.id)).not.toBeNull()
        })
    })
})
