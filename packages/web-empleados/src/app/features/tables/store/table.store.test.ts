import { TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { of, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import { Client, Table } from '../models/table.model'

function mesa(datos: Partial<Table> = {}): Table {
  return {
    id: 'table-1',
    restaurantId: 'rest-1',
    number: 1,
    description: null,
    capacity: 4,
    status: 'libre',
    reservedByClientId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...datos
  }
}

const clientes: Client[] = [{ id: 'cliente-1', firstName: 'Ana', lastName: 'López', email: 'ana@resttek.com' }]

function errorHttp(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error })
}

function configurar() {
  const service = {
    getAll: vi.fn().mockReturnValue(of([mesa(), mesa({ id: 'table-2', number: 2 })])),
    changeStatus: vi.fn(),
    getClients: vi.fn().mockReturnValue(of(clientes))
  }
  TestBed.configureTestingModule({ providers: [{ provide: TableService, useValue: service }] })
  return { store: TestBed.inject(TableStore), service }
}

describe('TableStore', () => {
  describe('load', () => {
    it('carga las mesas del restaurante', async () => {
      const { store, service } = configurar()
      await store.load('rest-1')
      expect(service.getAll).toHaveBeenCalledWith('rest-1')
      expect(store.tables().map(t => t.id)).toEqual(['table-1', 'table-2'])
      expect(store.loading()).toBe(false)
      expect(store.error()).toBeNull()
    })

    it('guarda el mensaje de la API si falla', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(throwError(() => errorHttp(404, { error: 'X', message: 'Mesa no encontrada' })))
      await store.load('rest-1')
      expect(store.error()).toBe('Mesa no encontrada')
    })

    it('usa un texto genérico en español si la API responde 403 o 500', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(throwError(() => errorHttp(403, { error: 'Forbidden' })))
      await store.load('rest-1')
      expect(store.error()).toBe('No tienes permiso para realizar esta acción')

      service.getAll.mockReturnValue(throwError(() => errorHttp(500, { error: 'X', message: 'Something went wrong' })))
      await store.load('rest-1')
      expect(store.error()).toBe('Error al cargar las mesas')
    })
  })

  describe('loadClients', () => {
    it('carga los clientes', async () => {
      const { store } = configurar()
      await store.loadClients()
      expect(store.clients()).toEqual(clientes)
      expect(store.clientsError()).toBeNull()
    })

    it('guarda un aviso si falla la carga de clientes', async () => {
      const { store, service } = configurar()
      service.getClients.mockReturnValue(throwError(() => errorHttp(500, {})))
      await store.loadClients()
      expect(store.clients()).toEqual([])
      expect(store.clientsError()).toBe('No se han podido cargar los clientes')
    })
  })

  describe('changeStatus', () => {
    it('llama al servicio y reemplaza la mesa en la lista', async () => {
      const { store, service } = configurar()
      await store.load('rest-1')
      service.changeStatus.mockReturnValue(of(mesa({ status: 'reservada', reservedByClientId: 'cliente-1' })))

      const ok = await store.changeStatus('rest-1', 'table-1', 'reservada', 'cliente-1')

      expect(ok).toBe(true)
      expect(service.changeStatus).toHaveBeenCalledWith('rest-1', 'table-1', 'reservada', 'cliente-1')
      expect(store.tables()[0].status).toBe('reservada')
      expect(store.tables()[0].reservedByClientId).toBe('cliente-1')
      expect(store.tables()[1].status).toBe('libre')
    })

    it('guarda el error de la API y no cambia la lista', async () => {
      const { store, service } = configurar()
      await store.load('rest-1')
      service.changeStatus.mockReturnValue(throwError(() => errorHttp(400, {
        error: 'InvalidReservationClientError',
        message: 'Una mesa reservada necesita un cliente válido'
      })))

      const ok = await store.changeStatus('rest-1', 'table-1', 'reservada', 'x')

      expect(ok).toBe(false)
      expect(store.error()).toBe('Una mesa reservada necesita un cliente válido')
      expect(store.tables()[0].status).toBe('libre')
    })

    it('usa un texto genérico si la respuesta no trae mensaje', async () => {
      const { store, service } = configurar()
      service.changeStatus.mockReturnValue(throwError(() => errorHttp(0, null)))
      await store.changeStatus('rest-1', 'table-1', 'ocupada')
      expect(store.error()).toBe('Error al cambiar el estado de la mesa')
    })
  })

  describe('polling', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('startPolling carga al instante y cada 30 s', () => {
      const { store, service } = configurar()
      store.startPolling('rest-1')
      expect(service.getAll).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(30000)
      expect(service.getAll).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(30000)
      expect(service.getAll).toHaveBeenCalledTimes(3)
      store.stopPolling()
    })

    it('stopPolling detiene las recargas', () => {
      const { store, service } = configurar()
      store.startPolling('rest-1')
      store.stopPolling()
      vi.advanceTimersByTime(90000)
      expect(service.getAll).toHaveBeenCalledTimes(1)
    })

    it('un segundo startPolling no duplica el intervalo', () => {
      const { store, service } = configurar()
      store.startPolling('rest-1')
      store.startPolling('rest-1')
      service.getAll.mockClear()
      vi.advanceTimersByTime(30000)
      expect(service.getAll).toHaveBeenCalledTimes(1)
      store.stopPolling()
    })
  })
})
