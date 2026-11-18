import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { importProvidersFrom, signal } from '@angular/core'
import { ChevronLeft, LucideAngularModule, Plus, Trash2 } from 'lucide-angular'
import { of } from 'rxjs'
import { DishFormComponent } from './dish-form.component'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'

function configurar(params: Record<string, string> = {}) {
  const store = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const service = { getById: vi.fn() }
  const ingredientStore = {
    ingredients: signal([
      { id: 'ing-1', name: 'Tomate', unit: 'kg' },
      { id: 'ing-2', name: 'Lechuga', unit: 'ud' }
    ]),
    loadByRestaurant: vi.fn()
  }

  TestBed.configureTestingModule({
    imports: [DishFormComponent],
    providers: [
      provideRouter([]),
      importProvidersFrom(LucideAngularModule.pick({ ChevronLeft, Plus, Trash2 })),
      { provide: DishStore, useValue: store },
      { provide: DishService, useValue: service },
      { provide: IngredientStore, useValue: ingredientStore },
      {
        provide: ActivatedRoute,
        useValue: {
          parent: { paramMap: of(convertToParamMap({ restaurantId: 'rest-1' })) },
          paramMap: of(convertToParamMap(params))
        }
      }
    ]
  })

  const fixture = TestBed.createComponent(DishFormComponent)
  fixture.detectChanges()
  return { fixture, store, service, ingredientStore }
}

describe('DishFormComponent', () => {
  it('se crea el componente', () => {
    const { fixture } = configurar()
    expect(fixture.componentInstance).toBeTruthy()
  })

  describe('encabezado y etiquetas', () => {
    it('muestra "Nuevo plato" como h1', () => {
      const { fixture } = configurar()
      const h1 = fixture.nativeElement.querySelector('h1')
      expect(h1?.textContent?.trim()).toBe('Nuevo plato')
    })

    it('muestra "Editar plato" como h1 al editar', async () => {
      const { fixture, service } = configurar({ id: 'dish-1' })
      service.getById.mockReturnValue(of({
        id: 'dish-1', name: 'Paella', description: null, price: 12, category: 'principal',
        available: true, restaurantId: 'rest-1', ingredients: [], createdAt: '', updatedAt: ''
      }))
      await fixture.whenStable()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Editar plato')
    })

    it.each(['name', 'price', 'category', 'available', 'description'])('el control %s tiene un label asociado', campo => {
      const { fixture } = configurar()
      const control = fixture.nativeElement.querySelector(`[name="${campo}"]`) as HTMLElement
      expect(control.id).toBeTruthy()
      const label = fixture.nativeElement.querySelector(`label[for="${control.id}"]`)
      expect(label).not.toBeNull()
    })
  })

  describe('sección de ingredientes', () => {
    it('agrupa los controles en un fieldset con legend', () => {
      const { fixture } = configurar()
      const legend = fixture.nativeElement.querySelector('fieldset > legend')
      expect(legend?.textContent?.trim()).toBe('Ingredientes del plato')
    })

    it.each(['newIngredientId', 'newIngredientQty'])('el control %s tiene un label asociado', campo => {
      const { fixture } = configurar()
      const control = fixture.nativeElement.querySelector(`[name="${campo}"]`) as HTMLElement
      expect(control.id).toBeTruthy()
      expect(fixture.nativeElement.querySelector(`label[for="${control.id}"]`)).not.toBeNull()
    })
  })
})
