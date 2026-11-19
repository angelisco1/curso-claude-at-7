import { groupOrdersByTable } from './table-orders'
import { Table } from './table.model'
import { Order } from '../../orders/models/order.model'

function mesa(id: string, number: number, status: Table['status'] = 'libre'): Table {
  return {
    id,
    restaurantId: 'rest-1',
    number,
    description: null,
    capacity: 4,
    status,
    reservedByClientId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function pedido(id: string, tableId: string | null): Order {
  return { id, restaurantId: 'rest-1', tableId, clientId: null, createdAt: '2026-01-01T00:00:00.000Z', items: [] }
}

describe('groupOrdersByTable', () => {
  it('asocia a cada mesa los pedidos cuyo tableId es el id de la mesa', () => {
    const mesas = [mesa('t1', 1, 'ocupada'), mesa('t2', 2, 'ocupada')]
    const pedidos = [pedido('o1', 't1'), pedido('o2', 't2'), pedido('o3', 't1')]

    const resultado = groupOrdersByTable(mesas, pedidos)

    expect(resultado.map(r => r.table.id)).toEqual(['t1', 't2'])
    expect(resultado[0].orders.map(o => o.id)).toEqual(['o1', 'o3'])
    expect(resultado[1].orders.map(o => o.id)).toEqual(['o2'])
  })

  it('las mesas sin pedidos tienen una lista vacía', () => {
    const resultado = groupOrdersByTable([mesa('t1', 1)], [])
    expect(resultado).toEqual([{ table: mesa('t1', 1), orders: [] }])
  })

  it('ignora pedidos sin mesa o con un tableId que no es de ninguna mesa', () => {
    const resultado = groupOrdersByTable([mesa('t1', 1, 'ocupada')], [pedido('o1', null), pedido('o2', '5')])
    expect(resultado[0].orders).toEqual([])
  })

  it('mantiene el orden de las mesas', () => {
    const resultado = groupOrdersByTable([mesa('t3', 3), mesa('t1', 1)], [])
    expect(resultado.map(r => r.table.number)).toEqual([3, 1])
  })
})
