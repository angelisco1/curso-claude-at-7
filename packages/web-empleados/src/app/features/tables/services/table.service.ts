import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { Client, Table, TableStatus } from '../models/table.model'
import { environment } from '../../../../environments/environment'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`
  }

  getAll(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(this.buildUrl(restaurantId))
  }

  changeStatus(restaurantId: string, id: string, status: TableStatus, reservedByClientId?: string | null): Observable<Table> {
    const body = status === 'reservada' ? { status, reservedByClientId } : { status }
    return this.http.patch<Table>(`${this.buildUrl(restaurantId)}/${id}/status`, body)
  }

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${environment.apiUrl}/clients`)
  }
}
