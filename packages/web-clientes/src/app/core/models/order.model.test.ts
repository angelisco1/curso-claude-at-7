import { Order, orderTableLabel } from './order.model'

function pedido(datos: Partial<Order>): Order {
  return { id: 'o-1', restaurantId: 'rest-1', tableId: null, clientId: 'c-1', createdAt: '', items: [], ...datos }
}

describe('orderTableLabel', () => {
  it('usa el número de mesa', () => {
    expect(orderTableLabel(pedido({ tableId: 'table-rest-1-5', tableNumber: 5 }))).toBe('Mesa 5')
  })

  it('usa tableId si no hay número de mesa', () => {
    expect(orderTableLabel(pedido({ tableId: '7', tableNumber: null }))).toBe('Mesa 7')
  })

  it('devuelve null si el pedido no tiene mesa', () => {
    expect(orderTableLabel(pedido({ tableId: null, tableNumber: null }))).toBeNull()
  })
})
