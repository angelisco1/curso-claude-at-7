import { Injectable, computed, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { Client, Table, TableStatus } from '../models/table.model'
import { TableService } from '../services/table.service'
import { groupOrdersByTable } from '../models/table-orders'
import { OrderStore } from '../../orders/store/order.store'

const POLLING_MS = 30000
const FORBIDDEN_MESSAGE = 'No tienes permiso para realizar esta acción'

// Solo se muestra el `message` de la API en 400/404 (errores de dominio en español).
// 403 y el resto (500, red…) usan textos genéricos en español.
function apiErrorMessage(err: any, fallback: string): string {
  if (err?.status === 403) return FORBIDDEN_MESSAGE
  const message = err?.error?.message
  if ((err?.status === 400 || err?.status === 404) && typeof message === 'string' && message) {
    return message
  }
  return fallback
}

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly tableService = inject(TableService)
  private readonly orderStore = inject(OrderStore)

  private readonly _tables = signal<Table[]>([])
  private readonly _clients = signal<Client[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private readonly _clientsError = signal<string | null>(null)

  private pollingInterval: ReturnType<typeof setInterval> | null = null

  readonly tables = this._tables.asReadonly()
  readonly clients = this._clients.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly clientsError = this._clientsError.asReadonly()
  readonly tablesWithOrders = computed(() => groupOrdersByTable(this._tables(), this.orderStore.orders()))

  async load(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      const tables = await firstValueFrom(this.tableService.getAll(restaurantId))
      this._tables.set(tables)
    } catch (err) {
      this._error.set(apiErrorMessage(err, 'Error al cargar las mesas'))
    } finally {
      this._loading.set(false)
    }
  }

  async loadClients(): Promise<void> {
    this._clientsError.set(null)
    try {
      const clients = await firstValueFrom(this.tableService.getClients())
      this._clients.set(clients)
    } catch {
      this._clientsError.set('No se han podido cargar los clientes')
    }
  }

  async changeStatus(restaurantId: string, id: string, status: TableStatus, reservedByClientId?: string | null): Promise<boolean> {
    this._error.set(null)
    try {
      const updated = await firstValueFrom(
        this.tableService.changeStatus(restaurantId, id, status, reservedByClientId)
      )
      this._tables.update(tables => tables.map(t => t.id === updated.id ? updated : t))
      return true
    } catch (err) {
      this._error.set(apiErrorMessage(err, 'Error al cambiar el estado de la mesa'))
      return false
    }
  }

  startPolling(restaurantId: string): void {
    this.stopPolling()
    this.load(restaurantId)
    this.pollingInterval = setInterval(() => this.load(restaurantId), POLLING_MS)
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }
}
