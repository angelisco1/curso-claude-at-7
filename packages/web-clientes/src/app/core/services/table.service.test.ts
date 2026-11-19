import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { TableService } from './table.service'
import { Table } from '../models/table.model'

const mesa: Table = {
  id: 'table-rest-1-3',
  restaurantId: 'rest-1',
  number: 3,
  description: null,
  capacity: 4,
  status: 'reservada',
  reservedByClientId: 'cliente-1',
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z'
}

describe('TableService', () => {
  let service: TableService
  let http: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' }
      ]
    })
    service = TestBed.inject(TableService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => http.verify())

  it('getAvailable pide las mesas disponibles con el número de personas', async () => {
    const respuesta = firstValueFrom(service.getAvailable('rest-1', 3))

    const req = http.expectOne(r => r.url === '/api/v1/restaurants/rest-1/tables/available')
    expect(req.request.method).toBe('GET')
    expect(req.request.params.get('people')).toBe('3')
    req.flush([mesa])

    expect(await respuesta).toEqual([mesa])
  })

  it('occupy ocupa la mesa del restaurante y devuelve la mesa actualizada', async () => {
    const respuesta = firstValueFrom(service.occupy('rest-1', 'table-rest-1-3'))

    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-rest-1-3/occupy')
    expect(req.request.method).toBe('POST')
    const ocupada = { ...mesa, status: 'ocupada', reservedByClientId: null }
    req.flush(ocupada)

    expect(await respuesta).toEqual(ocupada)
  })
})
