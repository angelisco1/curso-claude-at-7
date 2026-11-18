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

  describe('añadir ingrediente', () => {
    async function preparar() {
      const ctx = configurar()
      await ctx.fixture.whenStable()
      ctx.fixture.detectChanges()
      const el = ctx.fixture.nativeElement as HTMLElement
      const select = el.querySelector('#dish-new-ingredient') as HTMLSelectElement
      const qty = el.querySelector('#dish-new-quantity') as HTMLInputElement
      const boton = el.querySelector('button[aria-label="Añadir ingrediente"]') as HTMLButtonElement
      const elegir = (id: string) => { select.value = id; select.dispatchEvent(new Event('change')) }
      const cantidad = (v: string) => { qty.value = v; qty.dispatchEvent(new Event('input')) }
      return { ...ctx, el, select, qty, boton, elegir, cantidad }
    }

    it('el botón es un button[type=button] con aria-label', async () => {
      const { boton } = await preparar()
      expect(boton).not.toBeNull()
      expect(boton.tagName).toBe('BUTTON')
      expect(boton.getAttribute('type')).toBe('button')
    })

    it('añade el ingrediente con datos válidos', async () => {
      const { fixture, boton, elegir, cantidad } = await preparar()
      elegir('ing-1')
      cantidad('3')
      boton.click()
      fixture.detectChanges()
      expect(fixture.componentInstance.form.ingredients).toEqual([{ ingredientId: 'ing-1', quantity: 3 }])
    })

    it('con datos inválidos no añade y marca los campos con aria-invalid y aria-describedby', async () => {
      const { fixture, el, select, qty, boton, cantidad } = await preparar()
      cantidad('0')
      boton.click()
      fixture.detectChanges()

      expect(fixture.componentInstance.form.ingredients).toEqual([])
      expect(select.getAttribute('aria-invalid')).toBe('true')
      expect(qty.getAttribute('aria-invalid')).toBe('true')
      const msgSelect = el.querySelector(`#${select.getAttribute('aria-describedby')}`)
      const msgQty = el.querySelector(`#${qty.getAttribute('aria-describedby')}`)
      expect(msgSelect?.textContent).toContain('Selecciona un ingrediente')
      expect(msgQty?.textContent).toContain('La cantidad debe ser mayor que 0')
    })
  })

  describe('lista de ingredientes', () => {
    async function conIngredientes() {
      const ctx = configurar()
      await ctx.fixture.whenStable()
      ctx.fixture.componentInstance.form.ingredients = [
        { ingredientId: 'ing-1', quantity: 2 },
        { ingredientId: 'ing-2', quantity: 1 }
      ]
      ctx.fixture.detectChanges()
      return ctx
    }

    it('pinta los ingredientes en un ul > li', async () => {
      const { fixture } = await conIngredientes()
      const items = fixture.nativeElement.querySelectorAll('ul li')
      expect(items.length).toBe(2)
      expect(items[0].textContent).toContain('Tomate')
    })

    it('cada ingrediente tiene un botón "Quitar <nombre>"', async () => {
      const { fixture } = await conIngredientes()
      const boton = fixture.nativeElement.querySelector('ul li button') as HTMLButtonElement
      expect(boton.getAttribute('type')).toBe('button')
      expect(boton.getAttribute('aria-label')).toBe('Quitar Tomate (kg)')
    })

    it('al quitar se elimina y el foco vuelve al select de ingrediente', async () => {
      const { fixture } = await conIngredientes()
      document.body.appendChild(fixture.nativeElement)
      const boton = fixture.nativeElement.querySelector('ul li button') as HTMLButtonElement
      boton.click()
      fixture.detectChanges()
      expect(fixture.componentInstance.form.ingredients).toEqual([{ ingredientId: 'ing-2', quantity: 1 }])
      expect(document.activeElement).toBe(fixture.nativeElement.querySelector('#dish-new-ingredient'))
    })
  })
})
