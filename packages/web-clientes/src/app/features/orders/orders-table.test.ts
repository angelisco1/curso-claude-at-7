import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { Type, importProvidersFrom } from '@angular/core'
import { LucideAngularModule, Utensils } from 'lucide-angular'
import { of } from 'rxjs'
import { OrderDetailComponent } from './order-detail.component'
import { MyOrdersComponent } from './my-orders.component'
import { OrderService } from '../../core/services/order.service'
import { Order } from '../../core/models/order.model'

const pedido: Order = {
  id: 'order-seed-1', restaurantId: 'rest-1', restaurantName: 'La Tasca', restaurantLogoUrl: null,
  tableId: 'table-rest-1-5', tableNumber: 5, clientId: 'c-1', createdAt: '2026-11-19T10:00:00.000Z',
  items: [{ id: 'i-1', dishId: 'd-1', quantity: 1, notes: null, status: 'pendiente', dishName: 'Paella', dishPrice: 12 }]
}

function configurar<T>(componente: Type<T>) {
  const orderService = {
    getOrderById: vi.fn().mockReturnValue(of(pedido)),
    getMyOrders: vi.fn().mockReturnValue(of([pedido, { ...pedido, id: 'o-2', tableId: null, tableNumber: null }]))
  }
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ Utensils })),
      { provide: OrderService, useValue: orderService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'order-seed-1' }) } } }
    ]
  })
  const fixture = TestBed.createComponent(componente)
  fixture.detectChanges()
  return { fixture, el: fixture.nativeElement as HTMLElement }
}

describe('mesa en los pedidos del cliente', () => {
  it('el detalle del pedido muestra «Mesa N»', () => {
    const { fixture, el } = configurar(OrderDetailComponent)
    expect(el.querySelector('.order-table')?.textContent?.trim()).toBe('Mesa 5')
    fixture.destroy()
  })

  it('el listado de pedidos muestra «Mesa N» solo en los pedidos con mesa', () => {
    const { fixture, el } = configurar(MyOrdersComponent)
    const mesas = el.querySelectorAll('.order-table')
    expect(mesas.length).toBe(1)
    expect(mesas[0].textContent?.trim()).toBe('Mesa 5')
    fixture.destroy()
  })
})
