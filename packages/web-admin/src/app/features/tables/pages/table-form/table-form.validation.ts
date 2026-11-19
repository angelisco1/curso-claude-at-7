import type { TableDto, TableStatus } from '../../models/table.model'

export interface TableFormValue {
  number: number | null
  capacity: number | null
  description: string
  status: TableStatus
  reservedByClientId: string
}

export type TableFormErrors = Partial<Record<'number' | 'capacity' | 'reservedByClientId', string>>

function isPositiveInteger(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  const n = Number(value)
  return Number.isInteger(n) && n > 0
}

export function validateTableForm(form: TableFormValue): TableFormErrors {
  const errors: TableFormErrors = {}
  if (!isPositiveInteger(form.number)) {
    errors.number = 'El número de mesa debe ser un entero mayor que 0'
  }
  if (!isPositiveInteger(form.capacity)) {
    errors.capacity = 'La capacidad debe ser un entero mayor que 0'
  }
  if (form.status === 'reservada' && !form.reservedByClientId) {
    errors.reservedByClientId = 'Selecciona el cliente de la reserva'
  }
  return errors
}

// La API exige enteros JSON (no strings) y reservedByClientId null si la mesa no queda reservada
export function toTableDto(form: TableFormValue): TableDto {
  const description = (form.description ?? '').trim()
  return {
    number: Number(form.number),
    capacity: Number(form.capacity),
    description: description === '' ? null : description,
    status: form.status,
    reservedByClientId: form.status === 'reservada' ? form.reservedByClientId : null
  }
}
