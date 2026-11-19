import { TestBed } from '@angular/core/testing'
import { LUCIDE_ICONS, type LucideIconProviderInterface } from 'lucide-angular'
import { appConfig } from './app.config'

describe('appConfig', () => {
  // lucide-icon resuelve name="armchair" buscando la clave en PascalCase
  it('registra el icono armchair usado por la feature de mesas', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers })
    const proveedores = TestBed.inject(LUCIDE_ICONS) as unknown as LucideIconProviderInterface | LucideIconProviderInterface[]
    const lista = Array.isArray(proveedores) ? proveedores : [proveedores]
    expect(lista.some(p => p.hasIcon('Armchair'))).toBe(true)
  })
})
