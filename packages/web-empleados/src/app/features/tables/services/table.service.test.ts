import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { firstValueFrom } from 'rxjs'
import { TableService } from './table.service'
import { Client, Table } from '../models/table.model'

const mesa: Table = {
  id: 'table-1',
  restaurantId: 'rest-1',
  number: 1,
  description: null,
  capacity: 4,
  status: 'libre',
  reservedByClientId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

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

  it('getAll pide las mesas del restaurante', async () => {
    const respuesta = firstValueFrom(service.getAll('rest-1'))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables')
    expect(req.request.method).toBe('GET')
    req.flush([mesa])
    expect(await respuesta).toEqual([mesa])
  })

  it('changeStatus envía solo el estado cuando no es reservada', async () => {
    const respuesta = firstValueFrom(service.changeStatus('rest-1', 'table-1', 'ocupada'))
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-1/status')
    expect(req.request.method).toBe('PATCH')
    expect(req.request.body).toEqual({ status: 'ocupada' })
    req.flush({ ...mesa, status: 'ocupada' })
    expect((await respuesta).status).toBe('ocupada')
  })

  it('changeStatus omite reservedByClientId si el estado no es reservada', () => {
    service.changeStatus('rest-1', 'table-1', 'libre', 'cliente-1').subscribe()
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-1/status')
    expect(req.request.body).toEqual({ status: 'libre' })
    req.flush(mesa)
  })

  it('changeStatus envía el cliente cuando el estado es reservada', () => {
    service.changeStatus('rest-1', 'table-1', 'reservada', 'cliente-1').subscribe()
    const req = http.expectOne('/api/v1/restaurants/rest-1/tables/table-1/status')
    expect(req.request.body).toEqual({ status: 'reservada', reservedByClientId: 'cliente-1' })
    req.flush({ ...mesa, status: 'reservada', reservedByClientId: 'cliente-1' })
  })

  it('getClients pide el listado de clientes sin parámetros', async () => {
    const clientes: Client[] = [{ id: 'cliente-1', firstName: 'Ana', lastName: 'López', email: 'ana@resttek.com' }]
    const respuesta = firstValueFrom(service.getClients())
    const req = http.expectOne('/api/v1/clients')
    expect(req.request.method).toBe('GET')
    req.flush(clientes)
    expect(await respuesta).toEqual(clientes)
  })
})
