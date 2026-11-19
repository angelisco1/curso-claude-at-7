import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { Client, Table, TableDto } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAll(restaurantId: string) {
    return this.http.get<Table[]>(this.buildUrl(restaurantId))
  }

  getById(restaurantId: string, id: string) {
    return this.http.get<Table>(`${this.buildUrl(restaurantId)}/${id}`)
  }

  create(restaurantId: string, dto: TableDto) {
    return this.http.post<Table>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: TableDto) {
    return this.http.put<Table>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }

  getClients() {
    return this.http.get<Client[]>(`${environment.apiUrl}/clients`)
  }
}
