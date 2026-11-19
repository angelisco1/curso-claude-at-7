import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { of, throwError } from 'rxjs'
import { TableSelectionComponent } from './table-selection.component'
import { TableService } from '../../core/services/table.service'
import { TableSelectionStore } from '../../core/store/table-selection.store'
import { Table } from '../../core/models/table.model'

function crearMesa(datos: Partial<Table>): Table {
  return {
    id: 'table-rest-1-1',
    restaurantId: 'rest-1',
    number: 1,
    description: null,
    capacity: 2,
    status: 'libre',
    reservedByClientId: null,
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    ...datos
  }
}

const libre = crearMesa({ id: 'table-rest-1-4', number: 4, capacity: 4, description: 'Terraza' })
const reservada = crearMesa({ id: 'table-rest-1-3', number: 3, capacity: 4, status: 'reservada', reservedByClientId: 'cliente-1' })

function errorHttp(error: string, status = 400, message = 'La mesa ya no está disponible') {
  return new HttpErrorResponse({ status, error: { error, message } })
}

function configurar(opciones: { tieneMesa?: boolean } = {}) {
  const service = {
    getAvailable: vi.fn().mockReturnValue(of([libre, reservada])),
    occupy: vi.fn().mockReturnValue(of({ ...libre, status: 'ocupada' }))
  }
  const store = {
    select: vi.fn(),
    hasTableFor: vi.fn().mockReturnValue(opciones.tieneMesa ?? false)
  }

  TestBed.configureTestingModule({
    imports: [TableSelectionComponent],
    providers: [
      provideRouter([]),
      { provide: TableService, useValue: service },
      { provide: TableSelectionStore, useValue: store },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'rest-1' }) } } }
    ]
  })

  const router = TestBed.inject(Router)
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
  const fixture = TestBed.createComponent(TableSelectionComponent)
  fixture.detectChanges()
  const el = fixture.nativeElement as HTMLElement
  return { fixture, el, service, store, navigate }
}

function buscar(fixture: ReturnType<typeof configurar>['fixture'], personas: string) {
  const el = fixture.nativeElement as HTMLElement
  const input = el.querySelector('input[name="people"]') as HTMLInputElement
  input.value = personas
  input.dispatchEvent(new Event('input'))
  fixture.detectChanges()
  ;(el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'))
  fixture.detectChanges()
}

function elegir(fixture: ReturnType<typeof configurar>['fixture'], tableId: string) {
  const radio = (fixture.nativeElement as HTMLElement).querySelector(`input[type="radio"][value="${tableId}"]`) as HTMLInputElement
  radio.click()
  fixture.detectChanges()
}

function botonContinuar(el: HTMLElement): HTMLButtonElement {
  return Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Continuar')) as HTMLButtonElement
}

describe('TableSelectionComponent', () => {
  it('el campo de personas tiene un label asociado', () => {
    const { el } = configurar()
    const input = el.querySelector('input[name="people"]') as HTMLInputElement
    expect(el.querySelector(`label[for="${input.id}"]`)).not.toBeNull()
  })

  it('sin un número de personas válido no consulta las mesas', () => {
    const { fixture, el, service } = configurar()
    for (const personas of ['', '0', '21', '2.5']) {
      buscar(fixture, personas)
    }
    expect(service.getAvailable).not.toHaveBeenCalled()
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('entre 1 y 20')
  })

  it('muestra las mesas disponibles y destaca las reservadas para el cliente', () => {
    const { fixture, el, service } = configurar()
    buscar(fixture, '3')

    expect(service.getAvailable).toHaveBeenCalledWith('rest-1', 3)
    const opciones = el.querySelectorAll('input[type="radio"]')
    expect(opciones.length).toBe(2)
    const texto = el.textContent ?? ''
    expect(texto).toContain('Mesa 4')
    expect(texto).toContain('Terraza')
    expect(texto).toContain('Mesa 3')
    const etiquetas = el.querySelectorAll('.badge-reserved')
    expect(etiquetas.length).toBe(1)
    expect(etiquetas[0].textContent?.trim()).toBe('Reservada para ti')
    expect(etiquetas[0].closest('label')?.textContent).toContain('Mesa 3')
  })

  it('muestra un mensaje cuando no hay mesas disponibles', () => {
    const { fixture, el, service } = configurar()
    service.getAvailable.mockReturnValue(of([]))
    buscar(fixture, '8')
    expect(el.textContent).toContain('No hay mesas disponibles para 8 personas')
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(0)
  })

  it('«Continuar» está deshabilitado hasta elegir una mesa', () => {
    const { fixture, el } = configurar()
    buscar(fixture, '3')
    expect(botonContinuar(el).disabled).toBe(true)

    elegir(fixture, libre.id)

    expect(botonContinuar(el).disabled).toBe(false)
  })

  it('al continuar ocupa la mesa, la guarda y navega a la carta', () => {
    const { fixture, el, service, store, navigate } = configurar()
    const ocupada = { ...libre, status: 'ocupada' as const }
    service.occupy.mockReturnValue(of(ocupada))
    buscar(fixture, '3')
    elegir(fixture, libre.id)

    botonContinuar(el).click()
    fixture.detectChanges()

    expect(service.occupy).toHaveBeenCalledWith('rest-1', libre.id)
    expect(store.select).toHaveBeenCalledWith('rest-1', 3, ocupada)
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1'])
  })

  it.each(['TableNotAvailableError', 'TableNotFoundError'])('ante %s avisa y recarga las mesas', error => {
    const { fixture, el, service, store, navigate } = configurar()
    service.occupy.mockReturnValue(throwError(() => errorHttp(error, error === 'TableNotFoundError' ? 404 : 400)))
    buscar(fixture, '3')
    elegir(fixture, libre.id)
    service.getAvailable.mockReturnValue(of([reservada]))

    botonContinuar(el).click()
    fixture.detectChanges()

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('La mesa ya no está disponible')
    expect(service.getAvailable).toHaveBeenCalledTimes(2)
    expect(el.querySelectorAll('input[type="radio"]').length).toBe(1)
    expect(botonContinuar(el).disabled).toBe(true)
    expect(store.select).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('ante otro error muestra un mensaje genérico y no recarga', () => {
    const { fixture, el, service } = configurar()
    service.occupy.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { error: 'InternalServerError', message: 'Something went wrong' } })))
    buscar(fixture, '3')
    elegir(fixture, libre.id)

    botonContinuar(el).click()
    fixture.detectChanges()

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No se pudo ocupar la mesa')
    expect(service.getAvailable).toHaveBeenCalledTimes(1)
  })

  it('si ya tiene mesa en el restaurante no vuelve a ocupar y va a la carta', () => {
    const { service, navigate } = configurar({ tieneMesa: true })
    expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1'], { replaceUrl: true })
    expect(service.occupy).not.toHaveBeenCalled()
  })
})
