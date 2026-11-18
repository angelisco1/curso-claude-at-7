import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { validate_dish_form, validate_new_ingredient, type DishFormErrors, type NewIngredientErrors } from './dish-form.validation'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

type DishFormValue = Omit<CreateDishDto, 'price'> & { price: number | null }
type FormErrors = DishFormErrors & NewIngredientErrors

@Component({
  selector: 'app-dish-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './dish-form.component.html',
  styleUrl: './dish-form.component.css'
})
export class DishFormComponent implements OnInit {
  private readonly store = inject(DishStore)
  private readonly service = inject(DishService)
  readonly ingredientStore = inject(IngredientStore)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  readonly ingredientSelect = viewChild<ElementRef<HTMLSelectElement>>('ingredientSelect')

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  errors = signal<FormErrors>({})

  readonly summaryItems = computed(() => {
    const errors = this.errors()
    const items: { message: string, targetId: string }[] = []
    if (errors.name) items.push({ message: errors.name, targetId: 'dish-name' })
    if (errors.price) items.push({ message: errors.price, targetId: 'dish-price' })
    if (errors.ingredients) items.push({ message: errors.ingredients, targetId: 'dish-new-ingredient' })
    return items
  })

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: DishFormValue = this.emptyForm()

  private emptyForm(): DishFormValue {
    return {
      name: '',
      description: null,
      price: null,
      category: 'principal',
      available: true,
      ingredients: []
    }
  }

  newIngredientId = ''
  newIngredientQty: number | null = 1

  get pageTitle(): string {
    return this.isEditing ? 'Editar plato' : 'Nuevo plato'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/dishes`
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'entrante': 'Entrante',
      'principal': 'Principal',
      'postre': 'Postre',
      'bebida': 'Bebida'
    }
    return labels[category] ?? category
  }

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante o de plato, por eso
    // escuchamos los cambios de parámetros y reiniciamos el estado.
    combineLatest([this.route.parent?.paramMap ?? of(null), this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams, params]) => {
        const restaurantId = parentParams?.get('restaurantId') ?? ''
        const id = params.get('id')

        if (restaurantId && restaurantId !== this.restaurantId) {
          this.ingredientStore.loadByRestaurant(restaurantId)
        }
        this.restaurantId = restaurantId

        this.form = this.emptyForm()
        this.newIngredientId = ''
        this.newIngredientQty = 1
        this.error.set(null)
        this.errors.set({})
        this.isEditing = !!(id && this.restaurantId)
        this.dishId = this.isEditing ? id : null

        if (this.isEditing) {
          this.loadDish()
        }
      })
  }

  private async loadDish(): Promise<void> {
    this.loading.set(true)
    try {
      const dish = await firstValueFrom(this.service.getById(this.restaurantId, this.dishId!))
      this.form = {
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category: dish.category,
        available: dish.available,
        ingredients: [...dish.ingredients]
      }
    } catch {
      this.error.set('No se pudo cargar el plato.')
    } finally {
      this.loading.set(false)
    }
  }

  addIngredient(): void {
    const newErrors = validate_new_ingredient(this.newIngredientId, this.newIngredientQty, this.form.ingredients)
    this.errors.update(current => ({ ...current, ingredient: newErrors.ingredient, quantity: newErrors.quantity }))
    if (newErrors.ingredient || newErrors.quantity) return

    this.form.ingredients = [
      ...this.form.ingredients,
      { ingredientId: this.newIngredientId, quantity: this.newIngredientQty! }
    ]
    this.newIngredientId = ''
    this.newIngredientQty = 1
    this.revalidate()
  }

  focus_field(targetId: string, event?: Event): void {
    event?.preventDefault()
    this.host.nativeElement.querySelector<HTMLElement>(`#${targetId}`)?.focus()
  }

  select_described_by(): string | null {
    const ids = [
      this.errors().ingredient ? 'dish-new-ingredient-error' : null,
      this.errors().ingredients ? 'dish-ingredients-error' : null
    ].filter(Boolean)
    return ids.length > 0 ? ids.join(' ') : null
  }

  // Al corregir un campo se actualizan solo los errores que ya se estaban mostrando
  revalidate(): void {
    const current = this.errors()
    const fresh = validate_dish_form(this.form)
    this.errors.set({
      ...current,
      name: current.name ? fresh.name : undefined,
      price: current.price ? fresh.price : undefined,
      ingredients: current.ingredients ? fresh.ingredients : undefined
    })
  }

  removeIngredient(ingredientId: string): void {
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
    this.ingredientSelect()?.nativeElement.focus()
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    const validation = validate_dish_form(this.form)
    this.errors.update(current => ({ ...current, name: validation.name, price: validation.price, ingredients: validation.ingredients }))
    if (Object.keys(validation).length > 0) {
      const first = this.summaryItems()[0]
      if (first) this.focus_field(first.targetId)
      return
    }

    const dto: CreateDishDto = { ...this.form, price: this.form.price as number }
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
