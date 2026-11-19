import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { TableService } from './table.service'
import type { Client, Table, TableDto } from '../models/table.model'

const mesa: Table = {
  id: 'table-rest-1-1',
  restaurantId: 'rest-1',
  number: 1,
  description: 'Terraza',
  capacity: 4,
  status: 'libre',
  reservedByClientId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

const dto: TableDto = { number: 1, capacity: 4, description: null, status: 'libre', reservedByClientId: null }

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('getAll pide GET /api/v1/restaurants/:restaurantId/tables', async () => {
    const promesa = firstValueFrom(service.getAll('rest-1'))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables')
    expect(req.request.method).toBe('GET')
    req.flush([mesa])
    expect(await promesa).toEqual([mesa])
  })

  it('getById pide GET /api/v1/restaurants/:restaurantId/tables/:id', async () => {
    const promesa = firstValueFrom(service.getById('rest-1', 'table-rest-1-1'))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-rest-1-1')
    expect(req.request.method).toBe('GET')
    req.flush(mesa)
    expect(await promesa).toEqual(mesa)
  })

  it('create hace POST con el cuerpo y devuelve la mesa creada', async () => {
    const promesa = firstValueFrom(service.create('rest-1', dto))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual(dto)
    req.flush(mesa)
    expect(await promesa).toEqual(mesa)
  })

  it('update hace PUT a /tables/:id con los 5 campos', async () => {
    const promesa = firstValueFrom(service.update('rest-1', 'table-rest-1-1', dto))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-rest-1-1')
    expect(req.request.method).toBe('PUT')
    expect(req.request.body).toEqual(dto)
    req.flush(mesa)
    expect(await promesa).toEqual(mesa)
  })

  it('delete hace DELETE a /tables/:id', async () => {
    const promesa = firstValueFrom(service.delete('rest-1', 'table-rest-1-1'))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-rest-1-1')
    expect(req.request.method).toBe('DELETE')
    req.flush(null, { status: 204, statusText: 'No Content' })
    await promesa
  })

  it('getClients pide GET /api/v1/clients sin parámetros', async () => {
    const clientes: Client[] = [{ id: 'c-1', firstName: 'Ana', lastName: 'López', email: 'cliente1@resttek.com' }]
    const promesa = firstValueFrom(service.getClients())
    const req = http.expectOne('/api/v1/clients')
    expect(req.request.method).toBe('GET')
    expect(req.request.params.keys()).toEqual([])
    req.flush(clientes)
    expect(await promesa).toEqual(clientes)
  })
})
