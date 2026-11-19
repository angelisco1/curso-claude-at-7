import { Order, orderTableLabel } from './order.model'

function pedido(tableId: string | null, tableNumber: number | null): Order {
  return { id: 'o1', restaurantId: 'rest-1', tableId, tableNumber, clientId: null, createdAt: '', items: [] }
}

describe('orderTableLabel', () => {
  it('usa el número de mesa si lo hay', () => {
    expect(orderTableLabel(pedido('table-rest-1-5', 5))).toBe('5')
  })

  it('usa el tableId si no hay número de mesa', () => {
    expect(orderTableLabel(pedido('5', null))).toBe('5')
  })

  it('devuelve null si el pedido no tiene mesa', () => {
    expect(orderTableLabel(pedido(null, null))).toBeNull()
  })

  it('acepta pedidos sin el campo tableNumber', () => {
    const { tableNumber, ...sinNumero } = pedido('abc', null)
    expect(orderTableLabel(sinNumero as Order)).toBe('abc')
  })
})
