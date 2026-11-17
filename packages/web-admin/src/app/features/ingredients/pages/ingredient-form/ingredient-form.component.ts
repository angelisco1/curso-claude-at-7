import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { combineLatest, firstValueFrom, of } from 'rxjs'
import { IngredientStore } from '../../store/ingredient.store'
import { IngredientService } from '../../services/ingredient.service'
import type { CreateIngredientDto, IngredientUnit } from '../../models/ingredient.model'

@Component({
  selector: 'app-ingredient-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './ingredient-form.component.html',
  styleUrl: './ingredient-form.component.css'
})
export class IngredientFormComponent implements OnInit {
  private readonly store = inject(IngredientStore)
  private readonly service = inject(IngredientService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly destroyRef = inject(DestroyRef)

  isEditing = false
  ingredientId: string | null = null
  restaurantId: string = ''
  loading = signal(false)
  error = signal<string | null>(null)

  units: IngredientUnit[] = ['kg', 'g', 'l', 'ml', 'unidad']

  form: CreateIngredientDto = this.emptyForm()

  private emptyForm(): CreateIngredientDto {
    return { name: '', unit: 'kg', currentStock: 0 }
  }

  get pageTitle(): string {
    return this.isEditing ? 'Editar ingrediente' : 'Nuevo ingrediente'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/ingredients`
  }

  ngOnInit(): void {
    // El componente se reutiliza al cambiar de restaurante o de ingrediente, por
    // eso escuchamos los cambios de parámetros y reiniciamos el estado.
    combineLatest([this.route.parent?.paramMap ?? of(null), this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([parentParams, params]) => {
        this.restaurantId = parentParams?.get('restaurantId') ?? ''
        const id = params.get('id')

        this.form = this.emptyForm()
        this.error.set(null)
        this.isEditing = !!(id && this.restaurantId)
        this.ingredientId = this.isEditing ? id : null

        if (this.isEditing) {
          this.loadIngredient()
        }
      })
  }

  private async loadIngredient(): Promise<void> {
    this.loading.set(true)
    try {
      const ingredients = await firstValueFrom(this.service.getAll(this.restaurantId))
      const found = ingredients.find(i => i.id === this.ingredientId)
      if (found) {
        this.form = {
          name: found.name,
          unit: found.unit,
          currentStock: found.currentStock
        }
      }
    } catch {
      this.error.set('No se pudo cargar el ingrediente.')
    } finally {
      this.loading.set(false)
    }
  }

  async onSubmit(): Promise<void> {
    this.error.set(null)
    this.loading.set(true)
    try {
      if (this.isEditing && this.ingredientId) {
        await this.store.update(this.restaurantId, this.ingredientId, this.form)
      } else {
        await this.store.create(this.restaurantId, this.form)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'ingredients'])
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Error al guardar el ingrediente.')
    } finally {
      this.loading.set(false)
    }
  }
}
