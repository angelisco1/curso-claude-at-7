import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { RouterTestingHarness } from '@angular/router/testing'
import { Component, importProvidersFrom, signal } from '@angular/core'
import {
  Armchair, ChevronRight, LayoutDashboard, LogOut, LucideAngularModule, Package, Plus, Settings, Users, Utensils
} from 'lucide-angular'
import { AuthService, AuthStore } from '@resttek/web-shared'
import { ShellComponent } from './shell.component'
import { RestaurantStore } from '../../features/restaurants/store/restaurant.store'

@Component({ standalone: true, template: '' })
class VaciaComponent {}

async function configurar() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: '',
          component: ShellComponent,
          children: [{ path: 'restaurants/:restaurantId/dashboard', component: VaciaComponent }]
        }
      ]),
      importProvidersFrom(LucideAngularModule.pick({
        Armchair, ChevronRight, LayoutDashboard, LogOut, Package, Plus, Settings, Users, Utensils
      })),
      { provide: AuthService, useValue: { logout: vi.fn() } },
      {
        provide: AuthStore,
        useValue: {
          userRole: signal('admin'),
          user: signal({ firstName: 'Admin', lastName: 'Resttek', role: 'admin', restaurantId: null })
        }
      },
      {
        provide: RestaurantStore,
        useValue: {
          restaurants: signal([{ id: 'rest-1', name: 'La Tasca' }]),
          loading: signal(false),
          loadAll: vi.fn()
        }
      }
    ]
  })
  const harness = await RouterTestingHarness.create('/restaurants/rest-1/dashboard')
  harness.detectChanges()
  return harness.fixture.nativeElement as HTMLElement
}

describe('ShellComponent', () => {
  it('el submenú del restaurante tiene un enlace «Mesas» a sus mesas', async () => {
    const el = await configurar()
    const enlace = Array.from(el.querySelectorAll('a.sub-nav-item')).find(a => a.textContent?.trim() === 'Mesas')
    expect(enlace).toBeDefined()
    expect(enlace?.getAttribute('href')).toBe('/restaurants/rest-1/tables')
    expect(enlace?.querySelector('lucide-icon')?.getAttribute('name')).toBe('armchair')
  })
})
