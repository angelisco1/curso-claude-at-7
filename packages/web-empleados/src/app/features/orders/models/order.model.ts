export type OrderStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado'

export interface OrderItem {
  id: string
  dishId: string
  quantity: number
  notes: string | null
  status: OrderStatus
  dishName?: string
  dishPrice?: number
  dishCategory?: string
}

export interface Order {
  id: string
  restaurantId: string
  tableId: string | null
  tableNumber?: number | null
  clientId: string | null
  createdAt: string
  items: OrderItem[]
}

export interface UpdateOrderItemStatusDto {
  status: OrderStatus
}

// Muestra el número de mesa; los pedidos antiguos (tableId que no es de ninguna mesa) caen al tableId
export function orderTableLabel(order: Order): string | null {
  if (order.tableNumber != null) return String(order.tableNumber)
  return order.tableId
}
