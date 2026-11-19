import { TestBed } from '@angular/core/testing'
import { computed, signal } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { MesasComponent } from './mesas.component'
import { TableStore } from '../../store/table.store'
import { OrderStore } from '../../../orders/store/order.store'
import { Client, Table } from '../../models/table.model'
import { groupOrdersByTable } from '../../models/table-orders'
import { Order } from '../../../orders/models/order.model'

function mesa(datos: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    restaurantId: 'rest-1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    reservedByClientId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...datos
  }
}

const clientes: Client[] = [
  { id: 'cliente-1', firstName: 'Ana', lastName: 'López', email: 'ana@resttek.com' },
  { id: 'cliente-2', firstName: 'Luis', lastName: 'Pérez', email: 'luis@resttek.com' }
]

const pedidoMesa2: Order = {
  id: 'order-1',
  restaurantId: 'rest-1',
  tableId: 'table-2',
  clientId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  items: [
    { id: 'i1', dishId: 'd1', quantity: 2, notes: null, status: 'preparando', dishName: 'Paella' },
    { id: 'i2', dishId: 'd2', quantity: 1, notes: null, status: 'listo', dishName: 'Tarta' }
  ]
}

function configurar(mesas: Table[] = [
  mesa(),
  mesa({ id: 'table-2', number: 2, capacity: 6, status: 'ocupada', description: 'Terraza' }),
  mesa({ id: 'table-3', number: 3, capacity: 2, status: 'reservada', reservedByClientId: 'cliente-1' })
]) {
  const tables = signal(mesas)
  const orders = signal<Order[]>([pedidoMesa2])
  const tableStore = {
    tables,
    clients: signal(clientes),
    loading: signal(false),
    error: signal<string | null>(null),
    clientsError: signal<string | null>(null),
    tablesWithOrders: computed(() => groupOrdersByTable(tables(), orders())),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    loadClients: vi.fn().mockResolvedValue(undefined),
    changeStatus: vi.fn().mockResolvedValue(true)
  }
  const orderStore = { orders, startPolling: vi.fn(), stopPolling: vi.fn() }
  const authStore = { user: signal({ restaurantId: 'rest-1', role: 'camarero' }) }

  TestBed.configureTestingModule({
    imports: [MesasComponent],
    providers: [
      { provide: TableStore, useValue: tableStore },
      { provide: OrderStore, useValue: orderStore },
      { provide: AuthStore, useValue: authStore }
    ]
  })

  const fixture = TestBed.createComponent(MesasComponent)
  fixture.detectChanges()
  const el: HTMLElement = fixture.nativeElement
  return { fixture, el, tableStore, orderStore }
}

function tarjeta(el: HTMLElement, numero: number): HTMLElement {
  const card = el.querySelector<HTMLElement>(`[data-table-number="${numero}"]`)
  if (!card) throw new Error(`No hay tarjeta para la mesa ${numero}`)
  return card
}

function elegir(select: HTMLSelectElement, valor: string) {
  select.value = valor
  select.dispatchEvent(new Event('change'))
}

describe('MesasComponent', () => {
  it('muestra el título «Mesas»', () => {
    const { el } = configurar()
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Mesas')
  })

  it('pinta número, capacidad, estado y descripción de cada mesa', () => {
    const { el } = configurar()
    const card = tarjeta(el, 2)
    expect(card.textContent).toContain('Mesa 2')
    expect(card.textContent).toContain('6 personas')
    expect(card.textContent).toContain('Ocupada')
    expect(card.textContent).toContain('Terraza')
    expect(tarjeta(el, 1).textContent).toContain('Libre')
    expect(tarjeta(el, 3).textContent).toContain('Reservada')
  })

  it('arranca el polling de mesas y pedidos y carga los clientes', () => {
    const { tableStore, orderStore } = configurar()
    expect(tableStore.startPolling).toHaveBeenCalledWith('rest-1')
    expect(orderStore.startPolling).toHaveBeenCalledWith('rest-1')
    expect(tableStore.loadClients).toHaveBeenCalled()
  })

  it('para el polling al destruirse', () => {
    const { fixture, tableStore, orderStore } = configurar()
    fixture.destroy()
    expect(tableStore.stopPolling).toHaveBeenCalled()
    expect(orderStore.stopPolling).toHaveBeenCalled()
  })

  it('el selector de estado tiene etiqueta accesible y llama a changeStatus', () => {
    const { el, tableStore } = configurar()
    const select = tarjeta(el, 1).querySelector<HTMLSelectElement>('select.status-select')!
    const label = el.querySelector(`label[for="${select.id}"]`)
    expect(label?.textContent).toContain('Estado de la mesa 1')

    elegir(select, 'ocupada')

    expect(tableStore.changeStatus).toHaveBeenCalledWith('rest-1', 'table-1', 'ocupada')
  })

  it('al elegir reservada pide el cliente antes de llamar a changeStatus', async () => {
    const { fixture, el, tableStore } = configurar()
    elegir(tarjeta(el, 1).querySelector<HTMLSelectElement>('select.status-select')!, 'reservada')
    fixture.detectChanges()

    expect(tableStore.changeStatus).not.toHaveBeenCalled()
    const clientSelect = tarjeta(el, 1).querySelector<HTMLSelectElement>('select.client-select')!
    expect(clientSelect).toBeTruthy()
    const opciones = Array.from(clientSelect.options).map(o => o.textContent?.trim())
    expect(opciones).toContain('Ana López (ana@resttek.com)')

    const confirmar = tarjeta(el, 1).querySelector<HTMLButtonElement>('button.confirm-reservation')!
    expect(confirmar.disabled).toBe(true)

    elegir(clientSelect, 'cliente-2')
    fixture.detectChanges()
    expect(confirmar.disabled).toBe(false)
    confirmar.click()
    await fixture.whenStable()
    fixture.detectChanges()

    expect(tableStore.changeStatus).toHaveBeenCalledWith('rest-1', 'table-1', 'reservada', 'cliente-2')
    expect(tarjeta(el, 1).querySelector('select.client-select')).toBeNull()
  })

  it('cancelar la reserva no llama a changeStatus y oculta el selector de cliente', () => {
    const { fixture, el, tableStore } = configurar()
    elegir(tarjeta(el, 1).querySelector<HTMLSelectElement>('select.status-select')!, 'reservada')
    fixture.detectChanges()

    tarjeta(el, 1).querySelector<HTMLButtonElement>('button.cancel-reservation')!.click()
    fixture.detectChanges()

    expect(tableStore.changeStatus).not.toHaveBeenCalled()
    expect(tarjeta(el, 1).querySelector('select.client-select')).toBeNull()
    expect(tarjeta(el, 1).querySelector<HTMLSelectElement>('select.status-select')!.value).toBe('libre')
  })

  it('las mesas ocupadas listan los ítems de sus pedidos con su estado', () => {
    const { el } = configurar()
    const items = Array.from(tarjeta(el, 2).querySelectorAll('.table-order-item'))
      .map(i => Array.from(i.querySelectorAll('span')).map(s => s.textContent?.trim()).join(' '))
    expect(items).toEqual(['2x Paella preparando', '1x Tarta listo'])
  })

  it('una mesa ocupada sin pedidos activos lo indica', () => {
    const { el } = configurar([mesa({ id: 'table-9', number: 9, status: 'ocupada' })])
    expect(tarjeta(el, 9).textContent).toContain('Sin pedidos activos')
  })

  it('las mesas no ocupadas no listan pedidos', () => {
    const { el } = configurar()
    expect(tarjeta(el, 1).querySelector('.table-orders')).toBeNull()
  })

  it('muestra el error del store', () => {
    const { fixture, el, tableStore } = configurar()
    tableStore.error.set('La mesa ya no está disponible')
    fixture.detectChanges()
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('La mesa ya no está disponible')
  })

  it('muestra un aviso si no se han podido cargar los clientes', () => {
    const { fixture, el, tableStore } = configurar()
    tableStore.clientsError.set('No se han podido cargar los clientes')
    fixture.detectChanges()
    expect(el.textContent).toContain('No se han podido cargar los clientes')
  })

  describe('cabecera de la reserva', () => {
    it('la tarjeta de una mesa reservada muestra el nombre del cliente', () => {
      const { el } = configurar()
      expect(tarjeta(el, 3).querySelector('.reserved-by')?.textContent).toContain('Reservada para Ana López')
    })

    it('si el cliente no está en la lista cargada muestra «Cliente desconocido»', () => {
      const { fixture, el, tableStore } = configurar()
      tableStore.clients.set([])
      fixture.detectChanges()
      expect(tarjeta(el, 3).querySelector('.reserved-by')?.textContent).toContain('Reservada para Cliente desconocido')
    })

    it('las mesas no reservadas no muestran cliente', () => {
      const { el } = configurar()
      expect(tarjeta(el, 1).querySelector('.reserved-by')).toBeNull()
      expect(tarjeta(el, 2).querySelector('.reserved-by')).toBeNull()
    })
  })
})
