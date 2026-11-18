import type { DishIngredient } from '../../models/dish.model'

export interface DishFormValidable {
  name: string
  price: number | null
  ingredients: DishIngredient[]
}

export type DishFormErrors = Partial<Record<'name' | 'price' | 'ingredients', string>>

export function validate_dish_form(form: DishFormValidable): DishFormErrors {
  const errors: DishFormErrors = {}
  if (!form.name || form.name.trim() === '') {
    errors.name = 'El nombre es obligatorio'
  }
  if (form.price === null || form.price === undefined || !(form.price > 0)) {
    errors.price = 'El precio debe ser mayor que 0'
  }
  if (form.ingredients.length === 0) {
    errors.ingredients = 'Añade al menos un ingrediente'
  }
  return errors
}
