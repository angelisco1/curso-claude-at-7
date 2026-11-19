import { inject } from '@angular/core'
import { Router, type CanActivateFn } from '@angular/router'
import { TableSelectionStore } from '../store/table-selection.store'
import { CartStore } from '../store/cart.store'

/**
 * Exige mesa ocupada para el restaurante de la ruta (`:id`) o, si la ruta no
 * lo tiene (carrito), para el restaurante del carrito. Con el carrito vacío deja pasar.
 */
export const tableSelectedGuard: CanActivateFn = route => {
  const restaurantId = route.paramMap.get('id') ?? inject(CartStore).restaurantId()
  if (!restaurantId) return true
  if (inject(TableSelectionStore).hasTableFor(restaurantId)) return true
  return inject(Router).createUrlTree(['/restaurants', restaurantId, 'mesa'])
}
