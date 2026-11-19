import { Component, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { TableService } from '../../core/services/table.service'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { MAX_PEOPLE, Table, isValidPeopleCount } from '../../core/models/table.model'

const UNAVAILABLE_ERRORS = ['TableNotAvailableError', 'TableNotFoundError']

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
        </div>
      </div>

      <form class="card search-form" (submit)="$event.preventDefault(); search()" novalidate>
        <div class="form-group">
          <label for="people">¿Cuántas personas sois?</label>
          <input
            id="people"
            name="people"
            type="number"
            min="1"
            [max]="maxPeople"
            step="1"
            class="form-control"
            [value]="peopleInput()"
            (input)="peopleInput.set($any($event.target).value)"
            [attr.aria-invalid]="peopleError() ? 'true' : null"
            [attr.aria-describedby]="peopleError() ? 'people-error' : null">
        </div>
        <button type="submit" class="btn btn-primary">Buscar mesas</button>
        @if (peopleError()) {
          <p id="people-error" class="field-error" role="alert">{{ peopleError() }}</p>
        }
      </form>

      @if (error()) {
        <div class="alert-error" role="alert">{{ error() }}</div>
      }

      <div aria-live="polite">
        @if (loading()) {
          <div class="spinner"></div>
        } @else if (tables() !== null) {
          @if (tables()!.length === 0) {
            <div class="empty-state card">
              <p>No hay mesas disponibles para {{ searchedPeople() }} personas</p>
            </div>
          } @else {
            <fieldset class="tables">
              <legend>Mesas disponibles para {{ searchedPeople() }} personas</legend>
              @for (table of tables(); track table.id) {
                <label class="table-option card" [class.selected]="selectedId() === table.id">
                  <input
                    type="radio"
                    name="table"
                    [value]="table.id"
                    [checked]="selectedId() === table.id"
                    (change)="selectedId.set(table.id)">
                  <span class="table-info">
                    <strong>Mesa {{ table.number }}</strong>
                    <span class="table-capacity">Hasta {{ table.capacity }} personas</span>
                    @if (table.description) {
                      <span class="table-description">{{ table.description }}</span>
                    }
                  </span>
                  @if (table.status === 'reservada') {
                    <span class="badge badge-reserved">Reservada para ti</span>
                  }
                </label>
              }
            </fieldset>
            <button
              type="button"
              class="btn btn-primary continue-btn"
              [disabled]="!selectedId() || occupying()"
              (click)="continue()">
              @if (occupying()) {
                Ocupando mesa...
              } @else {
                Continuar
              }
            </button>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 720px;
      margin: 0 auto;
    }
    .search-form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
    }
    .search-form .form-group {
      flex: 1;
      min-width: 200px;
      margin-bottom: 0;
    }
    .field-error {
      width: 100%;
      color: var(--red);
      font-size: 13px;
    }
    .tables {
      border: none;
      padding: 0;
      margin: 0 0 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tables legend {
      font-weight: 600;
      margin-bottom: 12px;
    }
    .table-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      cursor: pointer;
    }
    .table-option.selected {
      border-color: var(--green-light);
    }
    .table-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }
    .table-capacity,
    .table-description {
      color: var(--text-muted);
      font-size: 13px;
    }
    .badge-reserved {
      background: var(--green-glow);
      color: var(--green-light);
    }
    .continue-btn {
      width: 100%;
      justify-content: center;
    }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly selectionStore = inject(TableSelectionStore)

  readonly maxPeople = MAX_PEOPLE
  readonly peopleInput = signal('')
  readonly peopleError = signal<string | null>(null)
  readonly searchedPeople = signal<number | null>(null)
  readonly tables = signal<Table[] | null>(null)
  readonly selectedId = signal<string | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly error = signal<string | null>(null)

  private restaurantId = ''

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!
    if (this.selectionStore.hasTableFor(this.restaurantId)) {
      this.router.navigate(['/restaurants', this.restaurantId], { replaceUrl: true })
    }
  }

  search(): void {
    const people = Number(this.peopleInput())
    if (this.peopleInput().trim() === '' || !isValidPeopleCount(people)) {
      this.peopleError.set(`Indica un número de personas entre 1 y ${MAX_PEOPLE}`)
      return
    }
    this.peopleError.set(null)
    this.error.set(null)
    this.searchedPeople.set(people)
    this.loadTables()
  }

  continue(): void {
    const tableId = this.selectedId()
    const people = this.searchedPeople()
    if (!tableId || people === null) return

    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, tableId).subscribe({
      next: table => {
        this.selectionStore.select(this.restaurantId, people, table)
        this.occupying.set(false)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err: HttpErrorResponse) => {
        this.occupying.set(false)
        if (UNAVAILABLE_ERRORS.includes(err.error?.error)) {
          this.error.set(`${err.error?.message || 'La mesa ya no está disponible'}. Elige otra mesa.`)
          this.loadTables()
        } else {
          this.error.set('No se pudo ocupar la mesa. Inténtalo de nuevo.')
        }
      }
    })
  }

  private loadTables(): void {
    const people = this.searchedPeople()
    if (people === null) return

    this.loading.set(true)
    this.selectedId.set(null)
    this.tableService.getAvailable(this.restaurantId, people).subscribe({
      next: tables => {
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.tables.set(null)
        this.loading.set(false)
        this.error.set('No se pudieron cargar las mesas disponibles. Inténtalo de nuevo.')
      }
    })
  }
}
