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

// Cuerpo de POST y PUT: web-admin envía siempre los 5 campos
export interface TableDto {
  number: number
  capacity: number
  description: string | null
  status: TableStatus
  reservedByClientId: string | null
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
}
