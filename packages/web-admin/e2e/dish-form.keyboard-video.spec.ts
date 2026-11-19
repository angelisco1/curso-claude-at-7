import { test, expect } from '@playwright/test'
import path from 'node:path'
import { elegir_opcion_con_teclado, login_as_admin, tab_hasta } from './helpers'

test.use({
  video: 'on',
  viewport: { width: 1280, height: 800 },
  launchOptions: { slowMo: 400 }
})

// El vídeo versionado solo se regenera con `npm run e2e:video`, para no modificar un fichero
// del repo cada vez que se ejecutan los E2E.
test.afterEach(async ({ page }) => {
  if (!process.env['GRABAR_VIDEO']) return
  const video = page.video()
  await page.close()
  await video?.saveAs(path.resolve(__dirname, 'videos/dish-form-teclado.webm'))
})

test('crea un plato usando solo el teclado, primero con errores de validación', async ({ page }) => {
  test.setTimeout(240_000)
  const pausa = () => page.waitForTimeout(800)

  await login_as_admin(page)
  await page.goto('/restaurants/rest-1/dishes/new')
  await expect(page.getByRole('heading', { name: 'Nuevo plato' })).toBeVisible()
  await expect(page.locator('#dish-new-ingredient option')).not.toHaveCount(1)
  await pausa()

  // 1. Enviar el formulario vacío: se ven los errores y el foco va al nombre
  await tab_hasta(page, 'button[type="submit"]')
  await pausa()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('3 errores')
  await expect(page.locator('#dish-name')).toBeFocused()
  await pausa()
  await pausa()

  // 2. Rellenar el formulario con el teclado
  const nombre = `Plato E2E ${Date.now()}`
  await page.keyboard.type(nombre)
  await pausa()
  await page.keyboard.press('Tab')
  await page.keyboard.type('11.5')
  await pausa()
  await page.keyboard.press('Tab')
  await elegir_opcion_con_teclado(page, '#dish-category', 'Postre')
  await pausa()
  await page.keyboard.press('Tab')
  await expect(page.locator('#dish-available')).toBeFocused()
  await page.keyboard.press('Tab')
  await page.keyboard.type('Plato creado solo con el teclado')
  await pausa()
  await page.keyboard.press('Tab')
  await expect(page.locator('#dish-new-ingredient')).toBeFocused()
  await elegir_opcion_con_teclado(page, '#dish-new-ingredient', 'Tomate')
  await pausa()
  await page.keyboard.press('Tab')
  await expect(page.locator('#dish-new-quantity')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Añadir ingrediente' })).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(1)
  await pausa()

  // 3. Guardar con el teclado: el plato aparece en el listado
  await tab_hasta(page, 'button[type="submit"]')
  await pausa()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/restaurants\/rest-1\/dishes$/)
  // El plato nuevo queda al final del listado: se desplaza hasta verlo en pantalla
  const fila = page.getByText(nombre)
  await fila.scrollIntoViewIfNeeded()
  await expect(fila).toBeInViewport()
  await pausa()
  await pausa()
})
