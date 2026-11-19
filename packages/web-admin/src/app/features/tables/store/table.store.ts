import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { TableService } from '../services/table.service'
import type { Client, Table, TableDto } from '../models/table.model'

function sortByNumber(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => a.number - b.number)
}

@Injectable({ providedIn: 'root' })
export class TableStore {
  private readonly service = inject(TableService)

  private readonly _tables = signal<Table[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private readonly _clients = signal<Client[]>([])
  private readonly _clientsError = signal<string | null>(null)

  readonly tables = this._tables.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly clients = this._clients.asReadonly()
  readonly clientsError = this._clientsError.asReadonly()

  async loadByRestaurant(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getAll(restaurantId))
      this._tables.set(sortByNumber(data))
    } catch {
      this._error.set('No se pudieron cargar las mesas.')
    } finally {
      this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: TableDto): Promise<void> {
    const table = await firstValueFrom(this.service.create(restaurantId, dto))
    this._tables.update(list => sortByNumber([...list, table]))
  }

  async update(restaurantId: string, id: string, dto: TableDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._tables.update(list => sortByNumber(list.map(t => t.id === id ? updated : t)))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._tables.update(list => list.filter(t => t.id !== id))
  }

  async loadClients(): Promise<void> {
    this._clientsError.set(null)
    try {
      const data = await firstValueFrom(this.service.getClients())
      this._clients.set(data)
    } catch {
      this._clientsError.set('No se pudieron cargar los clientes.')
    }
  }
}
