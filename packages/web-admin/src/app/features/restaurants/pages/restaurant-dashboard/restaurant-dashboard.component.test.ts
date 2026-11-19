import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { importProvidersFrom } from '@angular/core'
import { Armchair, LucideAngularModule, Package, Users, Utensils } from 'lucide-angular'
import { RestaurantDashboardComponent } from './restaurant-dashboard.component'
import { RestaurantStore } from '../../store/restaurant.store'

async function configurar() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'restaurants/:restaurantId', children: [{ path: 'dashboard', component: RestaurantDashboardComponent }] }
      ]),
      importProvidersFrom(LucideAngularModule.pick({ Armchair, Package, Users, Utensils })),
      { provide: RestaurantStore, useValue: { getById: vi.fn().mockReturnValue({ id: 'rest-1', name: 'La Tasca' }) } }
    ]
  })
  const harness = await RouterTestingHarness.create('/restaurants/rest-1/dashboard')
  return harness.routeNativeElement as HTMLElement
}

describe('RestaurantDashboardComponent', () => {
  it('muestra el nombre del restaurante', async () => {
    const el = await configurar()
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('La Tasca')
  })

  it('tiene una tarjeta «Mesas» que enlaza con las mesas del restaurante', async () => {
    const el = await configurar()
    const tarjeta = Array.from(el.querySelectorAll('a.dash-card')).find(a => a.querySelector('h3')?.textContent?.trim() === 'Mesas')
    expect(tarjeta).toBeDefined()
    expect(tarjeta?.getAttribute('href')).toBe('/restaurants/rest-1/tables')
    expect(tarjeta?.querySelector('lucide-icon')?.getAttribute('name')).toBe('armchair')
  })
})
