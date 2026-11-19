export type TableStatus = 'libre' | 'ocupada' | 'reservada'

export const TABLE_STATUSES: TableStatus[] = ['libre', 'ocupada', 'reservada']

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

export interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
}

const STATUS_LABELS: Record<TableStatus, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada'
}

export function tableStatusLabel(status: TableStatus): string {
  return STATUS_LABELS[status]
}

export const UNKNOWN_CLIENT = 'Cliente desconocido'

export function clientDisplayName(clientId: string, clients: Client[]): string {
  const client = clients.find(c => c.id === clientId)
  return client ? `${client.firstName} ${client.lastName}` : UNKNOWN_CLIENT
}
