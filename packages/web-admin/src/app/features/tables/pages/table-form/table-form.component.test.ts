import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { importProvidersFrom, signal } from '@angular/core'
import { ChevronLeft, LucideAngularModule } from 'lucide-angular'
import { of, throwError } from 'rxjs'
import { TableFormComponent } from './table-form.component'
import { TableStore } from '../../store/table.store'
import { TableService } from '../../services/table.service'
import type { Client } from '../../models/table.model'

const clientes: Client[] = [
  { id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' },
  { id: 'c-2', firstName: 'Luis', lastName: 'Pérez', email: 'cliente2@resttek.com' }
]

function configurarFormulario(params: Record<string, string> = {}, opciones: { clientsError?: string | null } = {}, mesa?: unknown) {
  const store = {
    clients: signal(clientes),
    clientsError: signal(opciones.clientsError ?? null),
    loadClients: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined)
  }
  // Si «mesa» es un error HTTP (status numérico), getById falla con él
  const esError = typeof (mesa as { status?: unknown } | undefined)?.status === 'number'
  const respuesta = esError ? throwError(() => mesa) : of(mesa)
  const service = { getById: vi.fn().mockReturnValue(respuesta) }

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

describe('TableFormComponent (edición)', () => {
  const mesaReservada = {
    id: 't-1', restaurantId: 'rest-1', number: 4, description: 'Ventana', capacity: 6,
    status: 'reservada' as const, reservedByClientId: 'c-2', createdAt: '', updatedAt: ''
  }

  async function editar(mesa: unknown = mesaReservada) {
    const ctx = configurarFormulario({ id: 't-1' }, {}, mesa)
    await ctx.refrescar()
    await ctx.refrescar()
    return ctx
  }

  it('muestra «Editar mesa» y carga la mesa por id', async () => {
    const { el, service } = await editar()
    expect(service.getById).toHaveBeenCalledWith('rest-1', 't-1')
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Editar mesa')
  })

  it('rellena los campos, el estado y el cliente de la reserva', async () => {
    const { el } = await editar()
    expect((el.querySelector('#table-number') as HTMLInputElement).value).toBe('4')
    expect((el.querySelector('#table-capacity') as HTMLInputElement).value).toBe('6')
    expect((el.querySelector('#table-description') as HTMLTextAreaElement).value).toBe('Ventana')
    expect((el.querySelector('#table-status') as HTMLSelectElement).value).toBe('reservada')
    expect((el.querySelector('#table-client') as HTMLSelectElement).value).toBe('c-2')
  })

  it('guarda con store.update enviando los 5 campos y vuelve al listado', async () => {
    const { store, navigate, escribir, enviar } = await editar()
    escribir('table-capacity', '8')
    await enviar()
    expect(store.create).not.toHaveBeenCalled()
    expect(store.update).toHaveBeenCalledWith('rest-1', 't-1', {
      number: 4, capacity: 8, description: 'Ventana', status: 'reservada', reservedByClientId: 'c-2'
    })
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'tables'])
  })

  it('al liberar una mesa reservada envía reservedByClientId null', async () => {
    const { store, elegir, enviar, refrescar } = await editar()
    elegir('table-status', 'libre')
    await refrescar()
    await enviar()
    expect(store.update).toHaveBeenCalledWith('rest-1', 't-1', {
      number: 4, capacity: 6, description: 'Ventana', status: 'libre', reservedByClientId: null
    })
  })

  it('muestra el error del backend en el campo número si está duplicado', async () => {
    const { el, store, navigate, enviar } = await editar()
    store.update.mockRejectedValue({ status: 400, error: { error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con ese número en este restaurante' } })
    await enviar()
    expect(navigate).not.toHaveBeenCalled()
    const numero = el.querySelector('#table-number') as HTMLElement
    expect(numero.getAttribute('aria-invalid')).toBe('true')
    expect(el.querySelector(`#${numero.getAttribute('aria-describedby')}`)?.textContent)
      .toContain('Ya existe una mesa con ese número en este restaurante')
  })

  it('muestra el error del backend en el cliente si la reserva no es válida', async () => {
    const { el, store, enviar } = await editar()
    store.update.mockRejectedValue({ status: 400, error: { error: 'InvalidReservationClientError', message: 'Una mesa reservada necesita un cliente válido' } })
    await enviar()
    const cliente = el.querySelector('#table-client') as HTMLElement
    expect(cliente.getAttribute('aria-invalid')).toBe('true')
    expect(el.querySelector(`#${cliente.getAttribute('aria-describedby')}`)?.textContent)
      .toContain('Una mesa reservada necesita un cliente válido')
  })

  it('muestra un texto genérico si el backend falla con 500', async () => {
    const { el, store, enviar } = await editar()
    store.update.mockRejectedValue({ status: 500, error: { error: 'InternalServerError', message: 'Something went wrong' } })
    await enviar()
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Error al guardar la mesa.')
  })

  it('muestra el mensaje del backend si la mesa no existe', async () => {
    const { el } = await editar({ status: 404, error: { error: 'TableNotFoundError', message: 'Mesa no encontrada' } })
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Mesa no encontrada')
  })

  it('muestra «Cliente desconocido» si el cliente reservado no está en /clients', async () => {
    const { el } = await editar({ ...mesaReservada, reservedByClientId: 'c-99' })
    const opciones = Array.from(el.querySelectorAll('#table-client option')).map(o => o.textContent?.trim())
    expect(opciones).toContain('Cliente desconocido')
    expect((el.querySelector('#table-client') as HTMLSelectElement).value).toBe('c-99')
  })
})
