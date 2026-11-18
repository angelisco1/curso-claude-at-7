import { test, expect } from '@playwright/test'
import { login_as_admin } from './helpers'

test('el admin llega al formulario de nuevo plato', async ({ page }) => {
  await login_as_admin(page)
  await page.goto('/restaurants/rest-1/dishes/new')
  await expect(page.getByText('Nuevo plato')).toBeVisible()
})
