import type { Employee } from '@employee/domain/Employee.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'

export class ListClientsUseCase {
    constructor(private readonly employeeRepo: IEmployeeRepository) {}

    async execute(): Promise<Employee[]> {
        return this.employeeRepo.findAllClients()
    }
}
