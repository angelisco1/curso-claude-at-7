import { apiErrorMessage, reservedClientName, tableStatusLabel } from './table.presentation'
import type { Client } from './table.model'

const clientes: Client[] = [{ id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' }]

describe('tableStatusLabel', () => {
  it.each([
    ['libre', 'Libre'],
    ['ocupada', 'Ocupada'],
    ['reservada', 'Reservada']
  ] as const)('%s → %s', (estado, etiqueta) => {
    expect(tableStatusLabel(estado)).toBe(etiqueta)
  })
})

describe('reservedClientName', () => {
  it('devuelve «Nombre Apellido» del cliente', () => {
    expect(reservedClientName(clientes, 'c-1')).toBe('Ana López')
  })

  it('devuelve «Cliente desconocido» si el id no está en la lista', () => {
    expect(reservedClientName(clientes, 'c-99')).toBe('Cliente desconocido')
    expect(reservedClientName([], 'c-1')).toBe('Cliente desconocido')
  })
})

describe('apiErrorMessage', () => {
  it('usa el message del backend en 400 y 404', () => {
    expect(apiErrorMessage({ status: 400, error: { error: 'TableOccupiedError', message: 'No se puede eliminar una mesa ocupada' } }, 'Genérico'))
      .toBe('No se puede eliminar una mesa ocupada')
    expect(apiErrorMessage({ status: 404, error: { error: 'TableNotFoundError', message: 'Mesa no encontrada' } }, 'Genérico'))
      .toBe('Mesa no encontrada')
  })

  it('usa el texto de respaldo en 403, 500 o sin message', () => {
    expect(apiErrorMessage({ status: 403, error: { error: 'Forbidden' } }, 'Genérico')).toBe('Genérico')
    expect(apiErrorMessage({ status: 500, error: { error: 'InternalServerError', message: 'Something went wrong' } }, 'Genérico')).toBe('Genérico')
    expect(apiErrorMessage({ status: 400, error: null }, 'Genérico')).toBe('Genérico')
    expect(apiErrorMessage(undefined, 'Genérico')).toBe('Genérico')
  })
})
