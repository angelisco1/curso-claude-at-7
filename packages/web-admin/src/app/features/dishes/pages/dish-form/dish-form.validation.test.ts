import { validate_dish_form } from './dish-form.validation'

const ingredientes = [{ ingredientId: 'ing-1', quantity: 2 }]

describe('validate_dish_form', () => {
  it('exige el nombre', () => {
    expect(validate_dish_form({ name: '', price: 5, ingredients: ingredientes }).name).toBe('El nombre es obligatorio')
    expect(validate_dish_form({ name: '   ', price: 5, ingredients: ingredientes }).name).toBe('El nombre es obligatorio')
  })

  it('exige un precio mayor que 0', () => {
    for (const price of [null, 0, -1]) {
      expect(validate_dish_form({ name: 'Plato', price, ingredients: ingredientes }).price).toBe('El precio debe ser mayor que 0')
    }
  })

  it('exige al menos un ingrediente', () => {
    expect(validate_dish_form({ name: 'Plato', price: 5, ingredients: [] }).ingredients).toBe('Añade al menos un ingrediente')
  })

  it('devuelve un objeto vacío si el formulario es válido', () => {
    expect(validate_dish_form({ name: 'Plato', price: 5, ingredients: ingredientes })).toEqual({})
    expect(validate_dish_form({ name: 'Plato', price: 5, ingredients: [...ingredientes, { ingredientId: 'ing-2', quantity: 1 }] })).toEqual({})
  })
})
