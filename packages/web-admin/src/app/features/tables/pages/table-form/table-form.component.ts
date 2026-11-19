import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, of } from 'rxjs'
import { TableStore } from '../../store/table.store'
import { TABLE_STATUSES, apiErrorMessage, tableStatusLabel } from '../../models/table.presentation'
import type { Client } from '../../models/table.model'
import { toTableDto, validateTableForm, type TableFormErrors, type TableFormValue } from './table-form.validation'

@Component({
  selector: 'app-table-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './table-form.component.html',
  styleUrl: './table-form.component.css'
})
export class TableFormComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

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
    return 'Nueva mesa'
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

  ngOnInit(): void {
    this.store.loadClients()
    combineLatest([this.route.parent?.paramMap ?? of(null), this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams]) => {
        this.restaurantId = parentParams?.get('restaurantId') ?? ''
        this.form = this.emptyForm()
        this.error.set(null)
        this.errors.set({})
      })
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
      await this.store.create(this.restaurantId, toTableDto(this.form))
      this.router.navigate(['/restaurants', this.restaurantId, 'tables'])
    } catch (err) {
      this.error.set(apiErrorMessage(err, 'Error al guardar la mesa.'))
    } finally {
      this.loading.set(false)
    }
  }
}
