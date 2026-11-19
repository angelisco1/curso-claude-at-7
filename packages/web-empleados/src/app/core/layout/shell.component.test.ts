import { TestBed } from '@angular/core/testing'
import { computed, importProvidersFrom, signal } from '@angular/core'
import { provideRouter } from '@angular/router'
import { AlertCircle, Armchair, Beer, Flame, LayoutGrid, LogOut, LucideAngularModule } from 'lucide-angular'
import { AuthService, AuthStore } from '@resttek/web-shared'
import { ShellComponent } from './shell.component'

function configurar(role: string) {
  const user = signal({ firstName: 'Eva', lastName: 'Ruiz', role, restaurantId: 'rest-1' })
  const authStore = { user, userRole: computed(() => user().role) }
  TestBed.configureTestingModule({
    imports: [ShellComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ AlertCircle, Armchair, Beer, Flame, LayoutGrid, LogOut })),
      { provide: AuthStore, useValue: authStore },
      { provide: AuthService, useValue: { logout: vi.fn() } }
    ]
  })
  const fixture = TestBed.createComponent(ShellComponent)
  fixture.detectChanges()
  return { fixture, el: fixture.nativeElement as HTMLElement, component: fixture.componentInstance }
}

describe('ShellComponent', () => {
  describe('canSeeMesas', () => {
    it('es verdadero para camarero', () => {
      expect(configurar('camarero').component.canSeeMesas()).toBe(true)
    })

    it('es verdadero para manager', () => {
      expect(configurar('manager').component.canSeeMesas()).toBe(true)
    })

    it('es falso para cocinero', () => {
      expect(configurar('cocinero').component.canSeeMesas()).toBe(false)
    })
  })

  it('muestra el enlace «Mesas» al camarero', () => {
    const { el } = configurar('camarero')
    const enlace = el.querySelector<HTMLAnchorElement>('a[href="/mesas"]')
    expect(enlace?.textContent).toContain('Mesas')
  })

  it('no muestra el enlace «Mesas» al cocinero', () => {
    const { el } = configurar('cocinero')
    expect(el.querySelector('a[href="/mesas"]')).toBeNull()
  })
})
