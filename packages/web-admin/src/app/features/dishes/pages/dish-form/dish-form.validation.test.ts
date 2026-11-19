import { validate_dish_form, validate_new_ingredient } from './dish-form.validation'

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

describe('validate_new_ingredient', () => {
  const actuales = [{ ingredientId: 'ing-1', quantity: 2 }]

  it('exige seleccionar un ingrediente', () => {
    expect(validate_new_ingredient('', 1, actuales).ingredient).toBe('Selecciona un ingrediente')
  })

  it('exige una cantidad mayor que 0', () => {
    for (const qty of [0, -3, null]) {
      expect(validate_new_ingredient('ing-2', qty, actuales).quantity).toBe('La cantidad debe ser mayor que 0')
    }
  })

  it('no permite repetir un ingrediente', () => {
    expect(validate_new_ingredient('ing-1', 1, actuales).ingredient).toBe('El ingrediente ya está en el plato')
  })

  it('devuelve un objeto vacío si es válido', () => {
    expect(validate_new_ingredient('ing-2', 1.5, actuales)).toEqual({})
  })
})
