import { isValidPeopleCount } from './table.model'

describe('isValidPeopleCount', () => {
  it('acepta enteros de 1 a 20', () => {
    for (const people of [1, 2, 10, 20]) {
      expect(isValidPeopleCount(people)).toBe(true)
    }
  })

  it('rechaza valores fuera de rango, decimales o vacíos', () => {
    for (const people of [0, -1, 21, 2.5, null, undefined, NaN]) {
      expect(isValidPeopleCount(people as number | null)).toBe(false)
    }
  })
})
