import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router'
import { importProvidersFrom, signal } from '@angular/core'
import { ChevronLeft, LucideAngularModule, Plus, Trash2 } from 'lucide-angular'
import { of } from 'rxjs'
import { DishFormComponent } from './dish-form.component'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'

function configurar(params: Record<string, string> = {}, plato?: unknown) {
  const store = { create: vi.fn().mockResolvedValue(undefined), update: vi.fn().mockResolvedValue(undefined) }
  const service = { getById: vi.fn().mockReturnValue(plato ? of(plato) : of(undefined)) }
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

  describe('enlace volver e iconos', () => {
    it('el enlace de volver tiene aria-label', () => {
      const { fixture } = configurar()
      const enlace = fixture.nativeElement.querySelector('a.back-link')
      expect(enlace.getAttribute('aria-label')).toBe('Volver al listado de platos')
    })

    it('todos los iconos son decorativos', async () => {
      const { fixture } = configurar()
      await fixture.whenStable()
      fixture.componentInstance.form.ingredients = [{ ingredientId: 'ing-1', quantity: 1 }]
      fixture.detectChanges()
      const iconos = Array.from(fixture.nativeElement.querySelectorAll('lucide-icon')) as HTMLElement[]
      expect(iconos.length).toBeGreaterThanOrEqual(3)
      for (const icono of iconos) {
        expect(icono.getAttribute('aria-hidden')).toBe('true')
      }
    })
  })

  describe('envío', () => {
    it('Guardar es submit y Cancelar es un enlace al listado', () => {
      const { fixture } = configurar()
      const el = fixture.nativeElement as HTMLElement
      expect(el.querySelector('form')).not.toBeNull()
      const guardar = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Guardar'))
      expect(guardar?.getAttribute('type')).toBe('submit')
      const cancelar = Array.from(el.querySelectorAll('a')).find(a => a.textContent?.includes('Cancelar'))
      expect(cancelar?.getAttribute('href')).toBe('/restaurants/rest-1/dishes')
    })

    it('al enviar datos válidos crea el plato y navega al listado', async () => {
      const { fixture, store } = configurar()
      await fixture.whenStable()
      const router = TestBed.inject(Router)
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
      const el = fixture.nativeElement as HTMLElement
      const name = el.querySelector('#dish-name') as HTMLInputElement
      name.value = 'Paella'
      name.dispatchEvent(new Event('input'))
      const price = el.querySelector('#dish-price') as HTMLInputElement
      price.value = '12'
      price.dispatchEvent(new Event('input'))
      fixture.componentInstance.form.ingredients = [{ ingredientId: 'ing-1', quantity: 2 }]
      fixture.detectChanges()

      el.querySelector('form')!.dispatchEvent(new Event('submit'))
      await fixture.whenStable()

      expect(store.create).toHaveBeenCalledWith('rest-1', fixture.componentInstance.form)
      expect(store.create.mock.calls[0][1]).toMatchObject({ name: 'Paella', price: 12 })
      expect(navigate).toHaveBeenCalledWith(['/restaurants', 'rest-1', 'dishes'])
    })
  })

  describe('validación en el envío', () => {
    async function enviarVacio() {
      const ctx = configurar()
      await ctx.fixture.whenStable()
      ctx.fixture.detectChanges()
      const el = ctx.fixture.nativeElement as HTMLElement
      el.querySelector('form')!.dispatchEvent(new Event('submit'))
      await ctx.fixture.whenStable()
      ctx.fixture.detectChanges()
      return { ...ctx, el }
    }
    const mensaje = (el: HTMLElement, control: Element | null) =>
      el.querySelector(`#${control?.getAttribute('aria-describedby')!.split(' ')[0]}`)

    it('el precio inicial está vacío', () => {
      const { fixture } = configurar()
      expect(fixture.componentInstance.form.price).toBeNull()
    })

    it('no llama a store.create y marca nombre y precio como inválidos', async () => {
      const { store, el } = await enviarVacio()
      expect(store.create).not.toHaveBeenCalled()
      const name = el.querySelector('#dish-name')
      const price = el.querySelector('#dish-price')
      expect(name?.getAttribute('aria-invalid')).toBe('true')
      expect(price?.getAttribute('aria-invalid')).toBe('true')
      expect(mensaje(el, name)?.textContent).toContain('El nombre es obligatorio')
      expect(mensaje(el, price)?.textContent).toContain('El precio debe ser mayor que 0')
    })

    it('asocia el fieldset y el select de ingredientes con el mensaje', async () => {
      const { el } = await enviarVacio()
      const fieldset = el.querySelector('fieldset')
      const select = el.querySelector('#dish-new-ingredient')
      expect(mensaje(el, fieldset)?.textContent).toContain('Añade al menos un ingrediente')
      expect(select?.getAttribute('aria-describedby')).toContain('dish-ingredients-error')
    })

    it('el error desaparece al corregir el campo o añadir un ingrediente', async () => {
      const { fixture, el } = await enviarVacio()
      const name = el.querySelector('#dish-name') as HTMLInputElement
      name.value = 'Paella'
      name.dispatchEvent(new Event('input'))
      fixture.detectChanges()
      expect(name.getAttribute('aria-invalid')).toBeNull()
      expect(el.querySelector('#dish-name-error')).toBeNull()

      const select = el.querySelector('#dish-new-ingredient') as HTMLSelectElement
      select.value = 'ing-1'
      select.dispatchEvent(new Event('change'))
      ;(el.querySelector('button[aria-label="Añadir ingrediente"]') as HTMLButtonElement).click()
      fixture.detectChanges()
      expect(el.querySelector('#dish-ingredients-error')).toBeNull()
      expect(el.querySelector('fieldset')?.getAttribute('aria-describedby')).toBeNull()
    })
  })

  describe('resumen de errores y foco', () => {
    async function preparar() {
      const ctx = configurar()
      await ctx.fixture.whenStable()
      document.body.appendChild(ctx.fixture.nativeElement)
      const el = ctx.fixture.nativeElement as HTMLElement
      const enviar = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'))
        await ctx.fixture.whenStable()
        ctx.fixture.detectChanges()
      }
      return { ...ctx, el, enviar }
    }

    it('muestra un resumen con role=alert, el número de errores y enlaces a cada campo', async () => {
      const { el, enviar } = await preparar()
      await enviar()
      const resumen = el.querySelector('.error-summary[role="alert"]')
      expect(resumen).not.toBeNull()
      expect(resumen!.textContent).toContain('3 errores')
      const enlaces = Array.from(resumen!.querySelectorAll('a')).map(a => a.getAttribute('href'))
      expect(enlaces).toEqual(['#dish-name', '#dish-price', '#dish-new-ingredient'])
    })

    it('mueve el foco al campo del nombre', async () => {
      const { el, enviar } = await preparar()
      await enviar()
      expect(document.activeElement).toBe(el.querySelector('#dish-name'))
    })

    it('si solo falta el ingrediente, el foco va al select de ingrediente', async () => {
      const { fixture, el, enviar } = await preparar()
      fixture.componentInstance.form.name = 'Paella'
      fixture.componentInstance.form.price = 10
      await enviar()
      expect(el.querySelector('.error-summary')!.textContent).toContain('1 error')
      expect(document.activeElement).toBe(el.querySelector('#dish-new-ingredient'))
    })

    it('al pulsar un enlace del resumen se enfoca el campo sin navegar', async () => {
      const { el, enviar } = await preparar()
      await enviar()
      const enlace = el.querySelector('.error-summary a[href="#dish-price"]') as HTMLAnchorElement
      const evento = new MouseEvent('click', { bubbles: true, cancelable: true })
      enlace.dispatchEvent(evento)
      expect(evento.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(el.querySelector('#dish-price'))
    })

    it('el error de la API se muestra con role=alert', async () => {
      const { fixture, el, store, enviar } = await preparar()
      store.create.mockRejectedValue({ error: { message: 'Fallo de la API' } })
      fixture.componentInstance.form.name = 'Paella'
      fixture.componentInstance.form.price = 10
      fixture.componentInstance.form.ingredients = [{ ingredientId: 'ing-1', quantity: 1 }]
      await enviar()
      const alerta = el.querySelector('.alert-error')
      expect(alerta?.getAttribute('role')).toBe('alert')
      expect(alerta?.textContent).toContain('Fallo de la API')
    })
  })

  describe('modo edición', () => {
    const plato = {
      id: 'dish-1', name: 'Paella', description: 'Con marisco', price: 12.5, category: 'principal',
      available: false, restaurantId: 'rest-1', createdAt: '', updatedAt: '',
      ingredients: [{ ingredientId: 'ing-1', quantity: 2 }]
    }

    async function editar() {
      const ctx = configurar({ id: 'dish-1' }, plato)
      await ctx.fixture.whenStable()
      ctx.fixture.detectChanges()
      await ctx.fixture.whenStable()
      return ctx
    }

    it('rellena los campos con el plato cargado', async () => {
      const { fixture, service } = await editar()
      expect(service.getById).toHaveBeenCalledWith('rest-1', 'dish-1')
      const el = fixture.nativeElement as HTMLElement
      expect((el.querySelector('#dish-name') as HTMLInputElement).value).toBe('Paella')
      expect((el.querySelector('#dish-price') as HTMLInputElement).value).toBe('12.5')
      expect((el.querySelector('#dish-description') as HTMLTextAreaElement).value).toBe('Con marisco')
      expect(el.querySelectorAll('ul li').length).toBe(1)
    })

    it('al enviar llama a store.update y no a store.create', async () => {
      const { fixture, store } = await editar()
      const router = TestBed.inject(Router)
      vi.spyOn(router, 'navigate').mockResolvedValue(true)
      ;(fixture.nativeElement as HTMLElement).querySelector('form')!.dispatchEvent(new Event('submit'))
      await fixture.whenStable()
      expect(store.update).toHaveBeenCalledWith('rest-1', 'dish-1', expect.objectContaining({ name: 'Paella', price: 12.5 }))
      expect(store.create).not.toHaveBeenCalled()
    })
  })
})
