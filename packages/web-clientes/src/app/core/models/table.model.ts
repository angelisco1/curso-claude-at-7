export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export interface Table {
  id: string
  restaurantId: string
  number: number
  description: string | null
  capacity: number
  status: TableStatus
  reservedByClientId: string | null
  createdAt: string
  updatedAt: string
}

export const MAX_PEOPLE = 20

export function isValidPeopleCount(people: number | null | undefined): boolean {
  return typeof people === 'number' && Number.isInteger(people) && people >= 1 && people <= MAX_PEOPLE
}
