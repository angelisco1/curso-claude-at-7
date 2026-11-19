import { Table } from './table.model'
import { Order } from '../../orders/models/order.model'

export interface TableWithOrders {
  table: Table
  orders: Order[]
}

export function groupOrdersByTable(tables: Table[], orders: Order[]): TableWithOrders[] {
  return tables.map(table => ({
    table,
    orders: orders.filter(order => order.tableId === table.id)
  }))
}
