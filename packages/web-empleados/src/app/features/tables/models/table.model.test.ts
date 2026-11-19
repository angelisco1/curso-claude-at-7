import { tableStatusLabel } from './table.model'

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
