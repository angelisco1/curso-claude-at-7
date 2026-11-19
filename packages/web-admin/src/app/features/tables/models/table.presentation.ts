import type { Client, TableStatus } from './table.model'

const STATUS_LABELS: Record<TableStatus, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
  reservada: 'Reservada'
}

export const TABLE_STATUSES: TableStatus[] = ['libre', 'ocupada', 'reservada']

export function tableStatusLabel(status: TableStatus): string {
  return STATUS_LABELS[status] ?? status
}

// «Nombre Apellido» en listados (C6); «Cliente desconocido» si el id no está en /clients
export function reservedClientName(clients: Client[], clientId: string): string {
  const client = clients.find(c => c.id === clientId)
  return client ? `${client.firstName} ${client.lastName}` : 'Cliente desconocido'
}

// Solo se muestra el message del backend en 400/404 (C4): 403 no trae message y 500 lo trae en inglés
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number, error?: { message?: unknown } | null } | null | undefined
  const message = e?.error?.message
  if ((e?.status === 400 || e?.status === 404) && typeof message === 'string' && message) {
    return message
  }
  return fallback
}
