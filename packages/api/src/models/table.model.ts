import { InvalidTableStatusError } from '@errors/DomainErrors.js'

export const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatusType = typeof VALID_TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    number: number
    description: string | null
    capacity: number
    status: TableStatusType
    reservedByClientId: string | null
    createdAt: string
    updatedAt: string
}

export function normalizeTableStatus(value: unknown): TableStatusType {
    if (typeof value !== 'string') {
        throw new InvalidTableStatusError()
    }

    const normalizedValue = value.trim().toLowerCase()
    if (!VALID_TABLE_STATUSES.includes(normalizedValue as TableStatusType)) {
        throw new InvalidTableStatusError()
    }
    return normalizedValue as TableStatusType
}
