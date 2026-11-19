import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
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

test('el orden de tabulación coincide con el orden visual', async ({ page }) => {
  await login_as_admin(page)
  await page.goto('/restaurants/rest-1/dishes/new')
  await expect(page.locator('#dish-new-ingredient option')).not.toHaveCount(1)
  await page.getByRole('link', { name: 'Volver al listado de platos' }).focus()

  const esperado = [
    'dish-name', 'dish-price', 'dish-category', 'dish-available', 'dish-description',
    'dish-new-ingredient', 'dish-new-quantity', 'Añadir ingrediente', 'Cancelar', 'Guardar'
  ]
  const recorrido: string[] = []
  for (let i = 0; i < esperado.length; i++) {
    await page.keyboard.press('Tab')
    recorrido.push(await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      return el.id || el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName
    }))
  }
  expect(recorrido).toEqual(esperado)
})

const etiquetas_wcag = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function analizar_formulario(page: import('@playwright/test').Page) {
  // Las animaciones de entrada (fade-in) falsean el cálculo de contraste de axe
  await page.waitForFunction(() => document.getAnimations().length === 0)
  const resultado = await new AxeBuilder({ page }).include('form').withTags(etiquetas_wcag).analyze()
  return resultado.violations.map(v => ({ id: v.id, impacto: v.impact, nodos: v.nodes.map(n => n.target.join(' ')) }))
}

test.describe('axe: WCAG 2.2 AA', () => {
  test('sin violaciones en el estado inicial', async ({ page }) => {
    await login_as_admin(page)
    await page.goto('/restaurants/rest-1/dishes/new')
    await expect(page.locator('#dish-new-ingredient option')).not.toHaveCount(1)
    expect(await analizar_formulario(page)).toEqual([])
  })

  test('sin violaciones con los errores visibles', async ({ page }) => {
    await login_as_admin(page)
    await page.goto('/restaurants/rest-1/dishes/new')
    await expect(page.locator('#dish-new-ingredient option')).not.toHaveCount(1)
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await analizar_formulario(page)).toEqual([])
  })
})
