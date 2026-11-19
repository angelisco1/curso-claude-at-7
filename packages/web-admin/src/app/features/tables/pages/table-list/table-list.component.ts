import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { apiErrorMessage, reservedClientName, tableStatusLabel } from '../../models/table.presentation'
import type { Table } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)
  restaurantId = ''
  deleteError = signal<string | null>(null)

  readonly statusLabel = tableStatusLabel

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante, por eso escuchamos
    // los cambios de parámetros en lugar de leer el snapshot una sola vez.
    this.store.loadClients()
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        this.restaurantId = params.get('restaurantId') ?? ''
        this.deleteError.set(null)
        if (this.restaurantId) {
          this.store.loadByRestaurant(this.restaurantId)
        }
      })
  }

  clientName(table: Table): string {
    if (table.status !== 'reservada' || !table.reservedByClientId) return '—'
    return reservedClientName(this.store.clients(), table.reservedByClientId)
  }

  async onDelete(table: Table): Promise<void> {
    if (!this.restaurantId) return
    if (!confirm(`¿Seguro que quieres eliminar la mesa ${table.number}?`)) return
    this.deleteError.set(null)
    try {
      await this.store.delete(this.restaurantId, table.id)
    } catch (err) {
      this.deleteError.set(apiErrorMessage(err, 'No se pudo eliminar la mesa.'))
    }
  }
}
