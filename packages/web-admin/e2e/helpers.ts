import type { Page } from '@playwright/test'

export async function login_as_admin(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill('admin@resttek.com')
  await page.getByLabel('Contraseña').fill('admin@resttek.com')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(url => !url.pathname.startsWith('/login'))
}
