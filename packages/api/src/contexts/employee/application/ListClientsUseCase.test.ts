import { describe, it, expect, beforeEach } from 'vitest'
import { MockEmployeeRepository } from '@employee/application/mocks/MockDependencies.js'
import { ListClientsUseCase } from '@employee/application/ListClientsUseCase.js'
import { Employee } from '@employee/domain/Employee.js'

const buildEmployee = (id: string, firstName: string, lastName: string, role: string) => Employee.create({
    id,
    firstName,
    lastName,
    email: `${id}@resttek.com`,
    passwordHash: 'hash',
    role,
    restaurantId: null
})

describe('ListClientsUseCase', () => {
    let employeeRepo: MockEmployeeRepository
    let useCase: ListClientsUseCase

    beforeEach(async () => {
        employeeRepo = new MockEmployeeRepository()
        useCase = new ListClientsUseCase(employeeRepo)

        await employeeRepo.save(buildEmployee('camarero', 'Ana', 'Abad', 'camarero'))
        await employeeRepo.save(buildEmployee('c-z', 'Zoe', 'Zamora', 'cliente'))
        await employeeRepo.save(buildEmployee('c-b', 'Bea', 'Gómez', 'cliente'))
        await employeeRepo.save(buildEmployee('c-a', 'Ana', 'Gómez', 'cliente'))
    })

    it('devuelve solo los clientes ordenados por apellido y nombre', async () => {
        const clients = await useCase.execute()

        expect(clients.map(c => c.id)).toEqual(['c-a', 'c-b', 'c-z'])
    })

    it('devuelve [] si no hay clientes', async () => {
        useCase = new ListClientsUseCase(new MockEmployeeRepository())

        expect(await useCase.execute()).toEqual([])
    })
})
