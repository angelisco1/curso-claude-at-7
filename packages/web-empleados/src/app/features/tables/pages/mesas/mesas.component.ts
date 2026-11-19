import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { TableStore } from '../../store/table.store'
import { OrderStore } from '../../../orders/store/order.store'
import { Client, TABLE_STATUSES, Table, TableStatus, clientDisplayName, tableStatusLabel } from '../../models/table.model'

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore)
  readonly tableStore = inject(TableStore)
  private readonly orderStore = inject(OrderStore)

  readonly statuses = TABLE_STATUSES
  readonly statusLabel = tableStatusLabel

  // Mesa a la que se está asignando una reserva (falta elegir cliente)
  readonly reservingTableId = signal<string | null>(null)
  readonly selectedClientId = signal('')

  private restaurantId: string | null = null

  ngOnInit(): void {
    this.restaurantId = this.authStore.user()?.restaurantId ?? null
    if (!this.restaurantId) return
    this.tableStore.startPolling(this.restaurantId)
    this.orderStore.startPolling(this.restaurantId)
    this.tableStore.loadClients()
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling()
    this.orderStore.stopPolling()
  }

  selectedStatus(table: Table): TableStatus {
    return this.reservingTableId() === table.id ? 'reservada' : table.status
  }

  onStatusChange(table: Table, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as TableStatus
    if (status === 'reservada') {
      this.reservingTableId.set(table.id)
      this.selectedClientId.set(table.reservedByClientId ?? '')
      return
    }
    this.reservingTableId.set(null)
    if (!this.restaurantId) return
    this.tableStore.changeStatus(this.restaurantId, table.id, status)
  }

  onClientChange(event: Event): void {
    this.selectedClientId.set((event.target as HTMLSelectElement).value)
  }

  async confirmReservation(table: Table): Promise<void> {
    const clientId = this.selectedClientId()
    if (!clientId || !this.restaurantId) return
    const ok = await this.tableStore.changeStatus(this.restaurantId, table.id, 'reservada', clientId)
    if (ok) this.reservingTableId.set(null)
  }

  cancelReservation(): void {
    this.reservingTableId.set(null)
    this.selectedClientId.set('')
  }

  reservedClientName(table: Table): string {
    return clientDisplayName(table.reservedByClientId ?? '', this.tableStore.clients())
  }

  clientOptionLabel(client: Client): string {
    return `${client.firstName} ${client.lastName} (${client.email})`
  }
}
