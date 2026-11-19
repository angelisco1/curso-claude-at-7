import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { importProvidersFrom, signal } from '@angular/core'
import { Edit, LucideAngularModule, Plus, Trash2, Armchair } from 'lucide-angular'
import { of } from 'rxjs'
import { TableListComponent } from './table-list.component'
import { TableStore } from '../../store/table.store'
import type { Client, Table } from '../../models/table.model'

function crearMesa(datos: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    restaurantId: 'rest-1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    reservedByClientId: null,
    createdAt: '',
    updatedAt: '',
    ...datos
  }
}

const clientes: Client[] = [{ id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' }]

function configurar(mesas: Table[] = [], opciones: { clients?: Client[], clientsError?: string | null, error?: string | null } = {}) {
  const store = {
    tables: signal(mesas),
    loading: signal(false),
    error: signal(opciones.error ?? null),
    clients: signal(opciones.clients ?? clientes),
    clientsError: signal(opciones.clientsError ?? null),
    loadByRestaurant: vi.fn().mockResolvedValue(undefined),
    loadClients: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  }

  TestBed.configureTestingModule({
    imports: [TableListComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ Plus, Edit, Trash2, Armchair })),
      { provide: TableStore, useValue: store },
      {
        provide: ActivatedRoute,
        useValue: { parent: { paramMap: of(convertToParamMap({ restaurantId: 'rest-1' })) } }
      }
    ]
  })

  const fixture = TestBed.createComponent(TableListComponent)
  fixture.detectChanges()
  return { fixture, store, el: fixture.nativeElement as HTMLElement }
}

function filas(el: HTMLElement): string[][] {
  return Array.from(el.querySelectorAll('tbody tr')).map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() ?? '')
  )
}

describe('TableListComponent', () => {
  afterEach(() => vi.restoreAllMocks())

  it('carga las mesas del restaurante y los clientes', () => {
    const { store } = configurar()
    expect(store.loadByRestaurant).toHaveBeenCalledWith('rest-1')
    expect(store.loadClients).toHaveBeenCalled()
  })

  it('muestra el título y el enlace para crear una mesa', () => {
    const { el } = configurar()
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Mesas')
    const enlaces = Array.from(el.querySelectorAll('a')).map(a => a.textContent?.trim())
    expect(enlaces).toContain('Nueva mesa')
  })

  it('pinta número, descripción, capacidad, estado y cliente de la reserva', () => {
    const { el } = configurar([
      crearMesa({ id: 'a', number: 1, description: 'Terraza', capacity: 4, status: 'libre' }),
      crearMesa({ id: 'b', number: 2, description: null, capacity: 2, status: 'reservada', reservedByClientId: 'c-1' }),
      crearMesa({ id: 'c', number: 3, capacity: 6, status: 'ocupada' })
    ])
    const datos = filas(el)
    expect(datos).toHaveLength(3)
    expect(datos[0].slice(0, 5)).toEqual(['1', 'Terraza', '4', 'Libre', '—'])
    expect(datos[1].slice(0, 5)).toEqual(['2', '—', '2', 'Reservada', 'Ana López'])
    expect(datos[2].slice(0, 5)).toEqual(['3', '—', '6', 'Ocupada', '—'])
  })

  it('muestra «Cliente desconocido» si el cliente de la reserva no está en /clients', () => {
    const { el } = configurar([crearMesa({ status: 'reservada', reservedByClientId: 'c-99' })])
    expect(filas(el)[0][4]).toBe('Cliente desconocido')
  })

  it('si falla la carga de clientes pinta las mesas y muestra un aviso', () => {
    const { el } = configurar(
      [crearMesa({ status: 'reservada', reservedByClientId: 'c-1' })],
      { clients: [], clientsError: 'No se pudieron cargar los clientes.' }
    )
    expect(filas(el)[0][4]).toBe('Cliente desconocido')
    expect(el.querySelector('[role="status"]')?.textContent).toContain('No se pudieron cargar los clientes.')
  })

  it('muestra el estado vacío', () => {
    const { el } = configurar([])
    expect(el.querySelector('table')).toBeNull()
    expect(el.querySelector('.empty-state')?.textContent).toContain('No hay mesas para este restaurante')
  })

  it('muestra el error de carga', () => {
    const { el } = configurar([], { error: 'No se pudieron cargar las mesas.' })
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar las mesas.')
  })

  it('los botones de acción tienen un nombre accesible con el número de mesa', () => {
    const { el } = configurar([crearMesa({ number: 7 })])
    expect(el.querySelector('a[aria-label="Editar mesa 7"]')).not.toBeNull()
    expect(el.querySelector('button[aria-label="Eliminar mesa 7"]')).not.toBeNull()
  })

  describe('borrado', () => {
    it('borra la mesa tras confirmar', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { el, store, fixture } = configurar([crearMesa({ id: 'a', number: 7 })])
      ;(el.querySelector('button[aria-label="Eliminar mesa 7"]') as HTMLButtonElement).click()
      await fixture.whenStable()
      expect(confirmar).toHaveBeenCalledWith('¿Seguro que quieres eliminar la mesa 7?')
      expect(store.delete).toHaveBeenCalledWith('rest-1', 'a')
    })

    it('no borra si se cancela la confirmación', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)
      const { el, store, fixture } = configurar([crearMesa({ id: 'a', number: 7 })])
      ;(el.querySelector('button[aria-label="Eliminar mesa 7"]') as HTMLButtonElement).click()
      await fixture.whenStable()
      expect(store.delete).not.toHaveBeenCalled()
    })

    it('muestra el mensaje del backend si no se puede borrar', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      const { el, store, fixture } = configurar([crearMesa({ id: 'a', number: 7, status: 'ocupada' })])
      store.delete.mockRejectedValue({ status: 400, error: { error: 'TableOccupiedError', message: 'No se puede eliminar una mesa ocupada' } })
      ;(el.querySelector('button[aria-label="Eliminar mesa 7"]') as HTMLButtonElement).click()
      await fixture.whenStable()
      fixture.detectChanges()
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se puede eliminar una mesa ocupada')
    })
  })
})
