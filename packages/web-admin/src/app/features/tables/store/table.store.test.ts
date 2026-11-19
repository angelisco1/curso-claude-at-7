import { TestBed } from '@angular/core/testing'
import { of, Subject, throwError } from 'rxjs'
import { TableStore } from './table.store'
import { TableService } from '../services/table.service'
import type { Client, Table, TableDto } from '../models/table.model'

function crearMesa(datos: Partial<Table> = {}): Table {
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

const dto: TableDto = { number: 3, capacity: 2, description: null, status: 'libre', reservedByClientId: null }

function configurar() {
  const service = {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getClients: vi.fn()
  }
  TestBed.configureTestingModule({
    providers: [{ provide: TableService, useValue: service }]
  })
  return { store: TestBed.inject(TableStore), service }
}

describe('TableStore', () => {
  describe('loadByRestaurant', () => {
    it('carga las mesas y gestiona loading', async () => {
      const { store, service } = configurar()
      const respuesta = new Subject<Table[]>()
      service.getAll.mockReturnValue(respuesta)

      const promesa = store.loadByRestaurant('rest-1')
      expect(store.loading()).toBe(true)
      respuesta.next([crearMesa()])
      respuesta.complete()
      await promesa

      expect(service.getAll).toHaveBeenCalledWith('rest-1')
      expect(store.tables()).toEqual([crearMesa()])
      expect(store.loading()).toBe(false)
      expect(store.error()).toBeNull()
    })

    it('ordena las mesas por número', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(of([crearMesa({ id: 'b', number: 5 }), crearMesa({ id: 'a', number: 2 })]))
      await store.loadByRestaurant('rest-1')
      expect(store.tables().map(t => t.number)).toEqual([2, 5])
    })

    it('guarda un mensaje de error si falla la carga', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(throwError(() => ({ status: 500 })))
      await store.loadByRestaurant('rest-1')
      expect(store.error()).toBe('No se pudieron cargar las mesas.')
      expect(store.loading()).toBe(false)
      expect(store.tables()).toEqual([])
    })
  })

  describe('create', () => {
    it('añade la mesa creada manteniendo el orden por número', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(of([crearMesa({ id: 'a', number: 1 }), crearMesa({ id: 'c', number: 5 })]))
      await store.loadByRestaurant('rest-1')
      service.create.mockReturnValue(of(crearMesa({ id: 'b', number: 3 })))

      await store.create('rest-1', dto)

      expect(service.create).toHaveBeenCalledWith('rest-1', dto)
      expect(store.tables().map(t => t.id)).toEqual(['a', 'b', 'c'])
    })

    it('propaga el error del backend', async () => {
      const { store, service } = configurar()
      const error = { status: 400, error: { error: 'DuplicatedTableNumberError', message: 'Ya existe una mesa con ese número en este restaurante' } }
      service.create.mockReturnValue(throwError(() => error))
      await expect(store.create('rest-1', dto)).rejects.toBe(error)
    })
  })

  describe('update', () => {
    it('reemplaza la mesa actualizada', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(of([crearMesa({ id: 'a', number: 1 }), crearMesa({ id: 'b', number: 2 })]))
      await store.loadByRestaurant('rest-1')
      service.update.mockReturnValue(of(crearMesa({ id: 'a', number: 9, capacity: 6 })))

      await store.update('rest-1', 'a', dto)

      expect(service.update).toHaveBeenCalledWith('rest-1', 'a', dto)
      expect(store.tables().map(t => t.id)).toEqual(['b', 'a'])
      expect(store.tables()[1].capacity).toBe(6)
    })
  })

  describe('delete', () => {
    it('quita la mesa borrada', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(of([crearMesa({ id: 'a' }), crearMesa({ id: 'b', number: 2 })]))
      await store.loadByRestaurant('rest-1')
      service.delete.mockReturnValue(of(undefined))

      await store.delete('rest-1', 'a')

      expect(service.delete).toHaveBeenCalledWith('rest-1', 'a')
      expect(store.tables().map(t => t.id)).toEqual(['b'])
    })

    it('propaga el error y no quita la mesa', async () => {
      const { store, service } = configurar()
      service.getAll.mockReturnValue(of([crearMesa({ id: 'a', status: 'ocupada' })]))
      await store.loadByRestaurant('rest-1')
      const error = { status: 400, error: { error: 'TableOccupiedError', message: 'No se puede eliminar una mesa ocupada' } }
      service.delete.mockReturnValue(throwError(() => error))

      await expect(store.delete('rest-1', 'a')).rejects.toBe(error)
      expect(store.tables().map(t => t.id)).toEqual(['a'])
    })
  })

  describe('loadClients', () => {
    const clientes: Client[] = [{ id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' }]

    it('carga los clientes', async () => {
      const { store, service } = configurar()
      service.getClients.mockReturnValue(of(clientes))
      await store.loadClients()
      expect(store.clients()).toEqual(clientes)
      expect(store.clientsError()).toBeNull()
    })

    it('guarda un aviso si falla la carga de clientes', async () => {
      const { store, service } = configurar()
      service.getClients.mockReturnValue(throwError(() => ({ status: 500 })))
      await store.loadClients()
      expect(store.clients()).toEqual([])
      expect(store.clientsError()).toBe('No se pudieron cargar los clientes.')
    })
  })
})
