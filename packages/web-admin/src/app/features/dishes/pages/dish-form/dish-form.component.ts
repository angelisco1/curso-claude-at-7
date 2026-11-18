import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { DishStore } from '../../store/dish.store'
import { DishService } from '../../services/dish.service'
import { validate_new_ingredient, type NewIngredientErrors } from './dish-form.validation'
import { IngredientStore } from '../../../ingredients/store/ingredient.store'
import type { CreateDishDto, DishCategory } from '../../models/dish.model'

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

  isEditing = false
  dishId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)
  errors = signal<NewIngredientErrors>({})

  categories: DishCategory[] = ['entrante', 'principal', 'postre', 'bebida']

  form: CreateDishDto = this.emptyForm()

  private emptyForm(): CreateDishDto {
    return {
      name: '',
      description: null,
      price: 0,
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
  }

  removeIngredient(ingredientId: string): void {
    this.form.ingredients = this.form.ingredients.filter(i => i.ingredientId !== ingredientId)
  }

  getIngredientName(ingredientId: string): string {
    const ingredient = this.ingredientStore.ingredients().find(i => i.id === ingredientId)
    return ingredient ? `${ingredient.name} (${ingredient.unit})` : ingredientId
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.loading.set(true)
    try {
      if (this.isEditing && this.dishId) {
        await this.store.update(this.restaurantId, this.dishId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'dishes'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el plato.')
    } finally {
      this.loading.set(false)
    }
  }
}
