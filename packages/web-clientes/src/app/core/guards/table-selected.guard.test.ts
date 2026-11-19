import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot, UrlTree, convertToParamMap, provideRouter } from '@angular/router'
import { signal } from '@angular/core'
import { tableSelectedGuard } from './table-selected.guard'
import { TableSelectionStore } from '../store/table-selection.store'
import { CartStore } from '../store/cart.store'
import { routes } from '../../app.routes'

function configurar(mesaPara: string | null, carritoDe: string | null = null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: TableSelectionStore, useValue: { hasTableFor: (id: string | null) => id !== null && id === mesaPara } },
      { provide: CartStore, useValue: { restaurantId: signal(carritoDe) } }
    ]
  })
}

function ejecutar(params: Record<string, string> = {}) {
  const route = { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot
  return TestBed.runInInjectionContext(() => tableSelectedGuard(route, {} as RouterStateSnapshot))
}

function url(resultado: unknown): string {
  expect(resultado).toBeInstanceOf(UrlTree)
  return TestBed.inject(Router).serializeUrl(resultado as UrlTree)
}

describe('tableSelectedGuard', () => {
  describe('en la carta de un restaurante', () => {
    it('deja pasar si hay mesa para ese restaurante', () => {
      configurar('rest-1')
      expect(ejecutar({ id: 'rest-1' })).toBe(true)
    })

    it('redirige a elegir mesa si no hay mesa', () => {
      configurar(null)
      expect(url(ejecutar({ id: 'rest-1' }))).toBe('/restaurants/rest-1/mesa')
    })

    it('redirige a elegir mesa si la mesa es de otro restaurante', () => {
      configurar('rest-2')
      expect(url(ejecutar({ id: 'rest-1' }))).toBe('/restaurants/rest-1/mesa')
    })
  })

  describe('en el carrito', () => {
    it('deja pasar con el carrito vacío', () => {
      configurar(null, null)
      expect(ejecutar()).toBe(true)
    })

    it('deja pasar si hay mesa para el restaurante del carrito', () => {
      configurar('rest-1', 'rest-1')
      expect(ejecutar()).toBe(true)
    })

    it('redirige a elegir mesa del restaurante del carrito si no hay mesa', () => {
      configurar('rest-2', 'rest-1')
      expect(url(ejecutar())).toBe('/restaurants/rest-1/mesa')
    })
  })
})

describe('rutas con mesa', () => {
  const hijas = routes.find(r => r.path === '')!.children as Route[]
  const ruta = (path: string) => hijas.find(r => r.path === path)

  it('existe la ruta de selección de mesa', () => {
    expect(ruta('restaurants/:id/mesa')).toBeDefined()
  })

  it.each(['restaurants/:id', 'cart'])('%s está protegida por tableSelectedGuard', path => {
    expect(ruta(path)?.canActivate ?? []).toContain(tableSelectedGuard)
  })
})
