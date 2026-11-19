import { TestBed } from '@angular/core/testing'
import { signal, Type } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { OrderStore } from '../store/order.store'
import { Order } from '../models/order.model'
import { CocinaComponent } from './cocina/cocina.component'
import { BarraComponent } from './barra/barra.component'
import { SalonComponent } from './salon/salon.component'

function pedido(id: string, tableId: string | null, tableNumber: number | null): Order {
  return {
    id,
    restaurantId: 'rest-1',
    tableId,
    tableNumber,
    clientId: null,
    createdAt: '',
    items: [
      { id: `${id}-c`, dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishName: 'Paella', dishCategory: 'principal' },
      { id: `${id}-b`, dishId: 'd2', quantity: 1, notes: null, status: 'pendiente', dishName: 'Agua', dishCategory: 'bebida' },
      { id: `${id}-l`, dishId: 'd3', quantity: 1, notes: null, status: 'listo', dishName: 'Tarta', dishCategory: 'postre' }
    ]
  }
}

function renderizar(componente: Type<unknown>): string[] {
  const orderStore = {
    orders: signal([pedido('order-aaaaaaaa', 'table-rest-1-5', 5), pedido('order-bbbbbbbb', '7', null)]),
    loading: signal(false),
    error: signal(null),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    updateItemStatus: vi.fn()
  }
  TestBed.configureTestingModule({
    imports: [componente],
    providers: [
      { provide: OrderStore, useValue: orderStore },
      { provide: AuthStore, useValue: { user: signal({ restaurantId: 'rest-1' }) } }
    ]
  })
  const fixture = TestBed.createComponent(componente)
  fixture.detectChanges()
  return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.table-badge')).map(b => b.textContent!.trim())
}

describe('«Mesa N» en las tarjetas de pedidos', () => {
  for (const [nombre, componente] of [['cocina', CocinaComponent], ['barra', BarraComponent], ['salón', SalonComponent]] as const) {
    it(`${nombre} muestra el número de mesa y, si no lo hay, el tableId`, () => {
      expect(renderizar(componente)).toEqual(['Mesa 5', 'Mesa 7'])
    })
  }
})
