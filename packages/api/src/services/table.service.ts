import { randomUUID } from 'crypto'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import {
    InvalidTableNumberError,
    InvalidTableCapacityError,
    DuplicatedTableNumberError,
    InvalidReservationClientError,
    TableNotFoundError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

// Los campos llegan sin tipar desde el cuerpo HTTP: el servicio los valida estrictamente
export interface CreateTableDTO {
    restaurantId: string
    number: unknown
    capacity: unknown
    description?: unknown
    status?: unknown
    reservedByClientId?: unknown
}

export interface UpdateTableDTO {
    number: unknown
    capacity: unknown
    description?: unknown
    status?: unknown
    reservedByClientId?: unknown
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly employeeRepository: IEmployeeRepository
    ) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = await this.buildTable({
            id: randomUUID(),
            restaurantId: dto.restaurantId,
            number: dto.number,
            capacity: dto.capacity,
            description: dto.description,
            status: dto.status ?? 'libre',
            reservedByClientId: dto.reservedByClientId,
            createdAt: now,
            updatedAt: now
        })

        await this.tableRepository.save(table)
        return table
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async update(restaurantId: string, id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.findById(restaurantId, id)
        const updated = await this.buildTable({
            id: existing.id,
            restaurantId: existing.restaurantId,
            number: dto.number,
            capacity: dto.capacity,
            description: dto.description,
            status: dto.status,
            reservedByClientId: dto.reservedByClientId,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.findById(restaurantId, id)
        if (existing.status === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id)
    }

    private async buildTable(props: {
        id: string
        restaurantId: string
        number: unknown
        capacity: unknown
        description: unknown
        status: unknown
        reservedByClientId: unknown
        createdAt: string
        updatedAt: string
    }): Promise<Table> {
        if (!isPositiveInteger(props.number)) {
            throw new InvalidTableNumberError()
        }
        if (!isPositiveInteger(props.capacity)) {
            throw new InvalidTableCapacityError()
        }
        const status = normalizeTableStatus(props.status)
        const reservedByClientId = await this.resolveReservation(status, props.reservedByClientId)

        const sameNumber = await this.tableRepository.findByNumber(props.restaurantId, props.number)
        if (sameNumber && sameNumber.id !== props.id) {
            throw new DuplicatedTableNumberError()
        }

        return {
            id: props.id,
            restaurantId: props.restaurantId,
            number: props.number,
            description: normalizeDescription(props.description),
            capacity: props.capacity,
            status,
            reservedByClientId,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }

    // Regla única de reserva: reservada exige un cliente existente; el resto de estados, null u omitido
    private async resolveReservation(status: Table['status'], reservedByClientId: unknown): Promise<string | null> {
        if (status !== 'reservada') {
            if (reservedByClientId !== null && reservedByClientId !== undefined) {
                throw new InvalidReservationClientError()
            }
            return null
        }

        if (typeof reservedByClientId !== 'string' || reservedByClientId.trim() === '') {
            throw new InvalidReservationClientError()
        }
        const client = await this.employeeRepository.findById(reservedByClientId)
        if (!client || client.role !== 'cliente') {
            throw new InvalidReservationClientError()
        }
        return client.id
    }
}

function isPositiveInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function normalizeDescription(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}
