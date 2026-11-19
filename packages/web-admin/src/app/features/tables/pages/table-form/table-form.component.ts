import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import { TABLE_STATUSES, apiErrorMessage, tableStatusLabel } from '../../models/table.presentation'
import type { Client, Table } from '../../models/table.model'
import { toTableDto, validateTableForm, type TableFormErrors, type TableFormValue } from './table-form.validation'

// Errores del backend que se muestran junto a su campo (C4)
const FIELD_ERRORS: Record<string, keyof TableFormErrors> = {
  InvalidTableNumberError: 'number',
  DuplicatedTableNumberError: 'number',
  InvalidTableCapacityError: 'capacity',
  InvalidReservationClientError: 'reservedByClientId'
}

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly service = inject(TableService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  isEditing = false
  tableId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)
  errors = signal<TableFormErrors>({})

  readonly statuses = TABLE_STATUSES
  readonly statusLabel = tableStatusLabel

  form: TableFormValue = this.emptyForm()

  readonly summaryItems = computed(() => {
    const errors = this.errors()
    const items: { message: string, targetId: string }[] = []
    if (errors.number) items.push({ message: errors.number, targetId: 'table-number' })
    if (errors.capacity) items.push({ message: errors.capacity, targetId: 'table-capacity' })
    if (errors.reservedByClientId) items.push({ message: errors.reservedByClientId, targetId: 'table-client' })
    return items
  })

  get pageTitle(): string {
    return this.isEditing ? 'Editar mesa' : 'Nueva mesa'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/tables`
  }

  private emptyForm(): TableFormValue {
    return { number: null, capacity: null, description: '', status: 'libre', reservedByClientId: '' }
  }

  clientOptionLabel(client: Client): string {
    return `${client.firstName} ${client.lastName} (${client.email})`
  }

  // El cliente reservado puede no estar en /clients (C6: «Cliente desconocido»)
  get hasUnknownClient(): boolean {
    const id = this.form.reservedByClientId
    return !!id && !this.store.clients().some(c => c.id === id)
  }

  ngOnInit(): void {
    this.store.loadClients()
    combineLatest([this.route.parent?.paramMap ?? of(null), this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams, params]) => {
        this.restaurantId = parentParams?.get('restaurantId') ?? ''
        const id = params.get('id')
        this.form = this.emptyForm()
        this.error.set(null)
        this.errors.set({})
        this.isEditing = !!(id && this.restaurantId)
        this.tableId = this.isEditing ? id : null
        if (this.isEditing) {
          this.loadTable()
        }
      })
  }

  private async loadTable(): Promise<void> {
    this.loading.set(true)
    try {
      const table: Table = await firstValueFrom(this.service.getById(this.restaurantId, this.tableId!))
      this.form = {
        number: table.number,
        capacity: table.capacity,
        description: table.description ?? '',
        status: table.status,
        reservedByClientId: table.reservedByClientId ?? ''
      }
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'No se pudo cargar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }

  focusField(targetId: string, event?: Event): void {
    event?.preventDefault()
    this.host.nativeElement.querySelector<HTMLElement>(`#${targetId}`)?.focus()
  }

  // Al corregir un campo se actualizan solo los errores que ya se estaban mostrando
  revalidate(): void {
    const current = this.errors()
    const fresh = validateTableForm(this.form)
    this.errors.set({
      number: current.number ? fresh.number : undefined,
      capacity: current.capacity ? fresh.capacity : undefined,
      reservedByClientId: current.reservedByClientId ? fresh.reservedByClientId : undefined
    })
  }

  private showBackendError(err: unknown): void {
    const message = apiErrorMessage(err, 'Error al guardar la mesa.')
    const code = (err as { error?: { error?: string } | null } | null)?.error?.error
    const field = code ? FIELD_ERRORS[code] : undefined
    // El selector de cliente solo existe con estado reservada; si no, el error va al aviso general
    const fieldVisible = field && (field !== 'reservedByClientId' || this.form.status === 'reservada')
    if (fieldVisible) {
      this.errors.set({ [field]: message })
      const first = this.summaryItems()[0]
      if (first) setTimeout(() => this.focusField(first.targetId))
    } else {
      this.error.set(message)
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const validation = validateTableForm(this.form)
    this.errors.set(validation)
    if (Object.keys(validation).length > 0) {
      const first = this.summaryItems()[0]
      if (first) setTimeout(() => this.focusField(first.targetId))
      return
    }

    this.loading.set(true)
    try {
      const dto = toTableDto(this.form)
      if (this.isEditing && this.tableId) {
        await this.store.update(this.restaurantId, this.tableId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err) {
      this.showBackendError(err)
    } finally {
      this.loading.set(false)
    }
  }
}
