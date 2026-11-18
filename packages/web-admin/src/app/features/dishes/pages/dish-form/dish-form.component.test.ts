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
})
