import { TestBed } from '@angular/core/testing'
import { Router, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { CartComponent } from './cart.component'
import { CartStore, Dish } from '../../core/store/cart.store'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { OrderService } from '../../core/services/order.service'
import { Table } from '../../core/models/table.model'

const plato: Dish = {
  id: 'd-1', name: 'Paella', description: null, price: 12, category: 'principal',
  available: true, restaurantId: 'rest-1', ingredients: []
}

const mesa: Table = {
  id: 'table-rest-1-4', restaurantId: 'rest-1', number: 4, description: null, capacity: 4,
  status: 'ocupada', reservedByClientId: null, createdAt: '', updatedAt: ''
}

function configurar() {
  sessionStorage.clear()
  const orderService = { createOrder: vi.fn().mockReturnValue(of({ id: 'order-1' })) }
  TestBed.configureTestingModule({
    imports: [CartComponent],
    providers: [provideRouter([]), { provide: OrderService, useValue: orderService }]
  })
  const cart = TestBed.inject(CartStore)
  const selection = TestBed.inject(TableSelectionStore)
  cart.addItem(plato, 2)
  selection.select('rest-1', 3, mesa)
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
  const fixture = TestBed.createComponent(CartComponent)
  fixture.detectChanges()
  return { fixture, el: fixture.nativeElement as HTMLElement, orderService, cart, selection, navigate }
}

describe('CartComponent', () => {
  it('muestra la mesa ocupada', () => {
    const { el } = configurar()
    expect(el.querySelector('.order-table')?.textContent?.trim()).toBe('Mesa 4')
  })

  it('al confirmar envía el id de la mesa y conserva la mesa seleccionada', () => {
    const { fixture, el, orderService, cart, selection, navigate } = configurar()
    const boton = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Confirmar pedido'))!

    boton.click()
    fixture.detectChanges()

    expect(orderService.createOrder).toHaveBeenCalledWith('rest-1', 'table-rest-1-4', [
      { dishId: 'd-1', quantity: 2, notes: null }
    ])
    expect(cart.items().length).toBe(0)
    expect(selection.hasTableFor('rest-1')).toBe(true)
    expect(navigate).toHaveBeenCalledWith(['/orders', 'order-1'])
  })
})
