import { Injectable, computed, signal } from '@angular/core'
import { Table } from '../models/table.model'

export const TABLE_SELECTION_KEY = 'resttek_table_selection'

interface TableSelection {
  restaurantId: string
  people: number
  table: Table
}

function readSelection(): TableSelection | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(TABLE_SELECTION_KEY)
    return raw ? JSON.parse(raw) as TableSelection : null
  } catch {
    return null
  }
}

@Injectable({ providedIn: 'root' })
export class TableSelectionStore {
  private readonly _selection = signal<TableSelection | null>(readSelection())

  readonly table = computed(() => this._selection()?.table ?? null)
  readonly restaurantId = computed(() => this._selection()?.restaurantId ?? null)
  readonly people = computed(() => this._selection()?.people ?? null)

  select(restaurantId: string, people: number, table: Table): void {
    const selection = { restaurantId, people, table }
    this._selection.set(selection)
    sessionStorage.setItem(TABLE_SELECTION_KEY, JSON.stringify(selection))
  }

  hasTableFor(restaurantId: string | null): boolean {
    return restaurantId !== null && this.restaurantId() === restaurantId
  }

  clear(): void {
    this._selection.set(null)
    sessionStorage.removeItem(TABLE_SELECTION_KEY)
  }
}
