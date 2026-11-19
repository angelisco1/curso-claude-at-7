import { Client, clientDisplayName, tableStatusLabel } from './table.model'

describe('tableStatusLabel', () => {
  it('devuelve «Libre» para libre', () => {
    expect(tableStatusLabel('libre')).toBe('Libre')
  })

  it('devuelve «Ocupada» para ocupada', () => {
    expect(tableStatusLabel('ocupada')).toBe('Ocupada')
  })

  it('devuelve «Reservada» para reservada', () => {
    expect(tableStatusLabel('reservada')).toBe('Reservada')
  })
})

describe('clientDisplayName', () => {
  const clientes: Client[] = [{ id: 'cliente-1', firstName: 'Ana', lastName: 'López', email: 'ana@resttek.com' }]

  it('devuelve «Nombre Apellido» del cliente', () => {
    expect(clientDisplayName('cliente-1', clientes)).toBe('Ana López')
  })

  it('devuelve «Cliente desconocido» si el id no está en la lista', () => {
    expect(clientDisplayName('otro', clientes)).toBe('Cliente desconocido')
    expect(clientDisplayName('cliente-1', [])).toBe('Cliente desconocido')
  })
})
