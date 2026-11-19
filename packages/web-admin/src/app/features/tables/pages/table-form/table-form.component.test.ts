import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { importProvidersFrom, signal } from '@angular/core'
import { ChevronLeft, LucideAngularModule } from 'lucide-angular'
import { of } from 'rxjs'
import { TableFormComponent } from './table-form.component'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import type { Client } from '../../models/table.model'

const clientes: Client[] = [
  { id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' },
  { id: 'c-2', firstName: 'Luis', lastName: 'Pérez', email: 'cliente2@resttek.com' }
]

function configurarFormulario(params: Record<string, string> = {}, opciones: { clientsError?: string | null } = {}) {
  const store = {
    clients: signal(clientes),
    clientsError: signal(opciones.clientsError ?? null),
    loadClients: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  }
  const service = { getById: vi.fn().mockReturnValue(of(undefined)) }

  TestBed.configureTestingModule({
    imports: [TableFormComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ ChevronLeft })),
      { provide: TableStore, useValue: store },
      { provide: TableService, useValue: service },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { paramMap: of(convertToParamMap({ restaurantId: 'rest-1' })) },
          paramMap: of(convertToParamMap(params))
        }
      }
    ]
  })

  const router = TestBed.inject(Router)
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
  const fixture = TestBed.createComponent(TableFormComponent)
  fixture.detectChanges()
  const el = fixture.nativeElement as HTMLElement

  const escribir = (id: string, valor: string) => {
    const input = el.querySelector(`#${id}`) as HTMLInputElement
    input.value = valor
    input.dispatchEvent(new Event('input'))
  }
  const elegir = (id: string, valor: string) => {
    const select = el.querySelector(`#${id}`) as HTMLSelectElement
    select.value = valor
    select.dispatchEvent(new Event('change'))
  }
  const enviar = async () => {
    ;(el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'))
    await fixture.whenStable()
    fixture.detectChanges()
  }
  const refrescar = async () => {
    await fixture.whenStable()
    fixture.detectChanges()
  }

  return { fixture, el, store, service, navigate, escribir, elegir, enviar, refrescar }
}

describe('TableFormComponent (alta)', () => {
  it('muestra «Nueva mesa» como h1 y carga los clientes', () => {
    const { el, store } = configurarFormulario()
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Nueva mesa')
    expect(store.loadClients).toHaveBeenCalled()
  })

  it.each(['number', 'capacity', 'description', 'status'])('el control %s tiene un label asociado', campo => {
    const { el } = configurarFormulario()
    const control = el.querySelector(`[name="${campo}"]`) as HTMLElement
    expect(control.id).toBeTruthy()
    expect(el.querySelector(`label[for="${control.id}"]`)).not.toBeNull()
  })

  it('el estado ofrece Libre, Ocupada y Reservada', async () => {
    const { el, refrescar } = configurarFormulario()
    await refrescar()
    const opciones = Array.from(el.querySelectorAll('#table-status option')).map(o => o.textContent?.trim())
    expect(opciones).toEqual(['Libre', 'Ocupada', 'Reservada'])
  })

  describe('selector de cliente', () => {
    it('no aparece si el estado no es reservada', async () => {
      const { el, refrescar } = configurarFormulario()
      await refrescar()
      expect(el.querySelector('#table-client')).toBeNull()
    })

    it('aparece con estado reservada, con label y opciones «Nombre Apellido (email)»', async () => {
      const { el, elegir, refrescar } = configurarFormulario()
      await refrescar()
      elegir('table-status', 'reservada')
      await refrescar()
      const select = el.querySelector('#table-client') as HTMLSelectElement
      expect(select).not.toBeNull()
      expect(el.querySelector('label[for="table-client"]')).not.toBeNull()
      const opciones = Array.from(select.querySelectorAll('option')).map(o => o.textContent?.trim())
      expect(opciones).toContain('Ana López (cliente1@resttek.com)')
      expect(opciones).toContain('Luis Pérez (cliente2@resttek.com)')
    })

    it('muestra un aviso si no se pudieron cargar los clientes', async () => {
      const { el, elegir, refrescar } = configurarFormulario({}, { clientsError: 'No se pudieron cargar los clientes.' })
      await refrescar()
      elegir('table-status', 'reservada')
      await refrescar()
      expect(el.textContent).toContain('No se pudieron cargar los clientes.')
    })
  })

  describe('validación', () => {
    it('con datos inválidos no envía y marca los campos con aria-invalid y aria-describedby', async () => {
      const { el, store, escribir, enviar, refrescar } = configurarFormulario()
      await refrescar()
      escribir('table-number', '0')
      escribir('table-capacity', '')
      await enviar()

      expect(store.create).not.toHaveBeenCalled()
      for (const [id, mensaje] of [
        ['table-number', 'El número de mesa debe ser un entero mayor que 0'],
        ['table-capacity', 'La capacidad debe ser un entero mayor que 0']
      ]) {
        const control = el.querySelector(`#${id}`) as HTMLElement
        expect(control.getAttribute('aria-invalid')).toBe('true')
        expect(el.querySelector(`#${control.getAttribute('aria-describedby')}`)?.textContent).toContain(mensaje)
      }
    })

    it('con estado reservada exige el cliente', async () => {
      const { el, store, escribir, elegir, enviar, refrescar } = configurarFormulario()
      await refrescar()
      escribir('table-number', '3')
      escribir('table-capacity', '4')
      elegir('table-status', 'reservada')
      await refrescar()
      await enviar()

      expect(store.create).not.toHaveBeenCalled()
      const select = el.querySelector('#table-client') as HTMLElement
      expect(select.getAttribute('aria-invalid')).toBe('true')
      expect(el.querySelector(`#${select.getAttribute('aria-describedby')}`)?.textContent).toContain('Selecciona el cliente de la reserva')
    })
  })

  describe('envío', () => {
    it('crea la mesa con números y reservedByClientId null y vuelve al listado', async () => {
      const { store, navigate, escribir, enviar, refrescar } = configurarFormulario()
      await refrescar()
      escribir('table-number', '3')
      escribir('table-capacity', '4')
      escribir('table-description', '  Terraza  ')
      await enviar()

      expect(store.create).toHaveBeenCalledWith('rest-1', {
        number: 3, capacity: 4, description: 'Terraza', status: 'libre', reservedByClientId: null
      })
      expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'tables'])
    })

    it('crea una mesa reservada con el cliente elegido', async () => {
      const { store, escribir, elegir, enviar, refrescar } = configurarFormulario()
      await refrescar()
      escribir('table-number', '5')
      escribir('table-capacity', '2')
      elegir('table-status', 'reservada')
      await refrescar()
      elegir('table-client', 'c-2')
      await enviar()

      expect(store.create).toHaveBeenCalledWith('rest-1', {
        number: 5, capacity: 2, description: null, status: 'reservada', reservedByClientId: 'c-2'
      })
    })

    it('muestra el mensaje del backend si falla el alta', async () => {
      const { el, store, navigate, escribir, enviar, refrescar } = configurarFormulario()
      store.create.mockRejectedValue({ status: 400, error: { error: 'InvalidReservationClientError', message: 'Una mesa reservada necesita un cliente válido' } })
      await refrescar()
      escribir('table-number', '3')
      escribir('table-capacity', '4')
      await enviar()

      expect(navigate).not.toHaveBeenCalled()
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Una mesa reservada necesita un cliente válido')
    })
  })
})
