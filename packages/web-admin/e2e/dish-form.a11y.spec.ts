import { test, expect } from '@playwright/test'
import { elegir_opcion_con_teclado, login_as_admin, tab_hasta } from './helpers'

test('el admin llega al formulario de nuevo plato', async ({ page }) => {
  await login_as_admin(page)
  await page.goto('/restaurants/rest-1/dishes/new')
  await expect(page.getByText('Nuevo plato')).toBeVisible()
})

test('añade un ingrediente y envía el formulario solo con el teclado', async ({ page }) => {
  await login_as_admin(page)
  await page.goto('/restaurants/rest-1/dishes/new')
  await expect(page.getByRole('heading', { name: 'Nuevo plato' })).toBeVisible()

  // Los ingredientes se cargan de forma asíncrona: hay que esperar a que existan las opciones
  await expect(page.locator('#dish-new-ingredient option')).not.toHaveCount(1)
  await tab_hasta(page, '#dish-new-ingredient')
  await elegir_opcion_con_teclado(page, '#dish-new-ingredient', 'Queso')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Cantidad')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Añadir ingrediente' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(1)

  const nombre = `Plato E2E ${Date.now()}`
  await page.getByLabel('Nombre del plato').fill(nombre)
  await page.getByLabel('Precio (€)').fill('9.5')
  await page.getByLabel('Nombre del plato').press('Enter')

  await expect(page).toHaveURL(/\/restaurants\/rest-1\/dishes$/)
  await expect(page.getByText(nombre)).toBeVisible()
})
