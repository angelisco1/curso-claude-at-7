import type { Page } from '@playwright/test'

export async function login_as_admin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@resttek.com')
  await page.getByLabel('Contraseña').fill('admin@resttek.com')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'))
}

// Pulsa Tab hasta que el foco llega al elemento que cumple el selector
export async function tab_hasta(page: Page, selector: string, max_pulsaciones = 30): Promise<void> {
  for (let i = 0; i < max_pulsaciones; i++) {
    const encontrado = await page.evaluate(sel => document.activeElement?.matches(sel) ?? false, selector)
    if (encontrado) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`El foco no llegó a "${selector}" tras ${max_pulsaciones} pulsaciones de Tab`)
}

// Elige una opción de un <select> enfocado usando solo el teclado. Se prueban las flechas y,
// si el navegador no cambia el valor (en macOS la flecha solo abre el desplegable), se escribe
// el comienzo del texto de la opción (búsqueda por tecleo nativa del select).
export async function elegir_opcion_con_teclado(page: Page, selector: string, texto: string): Promise<void> {
  const leer = () => page.locator(selector).evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent ?? '')
  const antes = await leer()
  await page.keyboard.press('ArrowDown')
  if ((await leer()) === antes) {
    await page.keyboard.press('Escape')
    await page.keyboard.type(texto)
  }
}
