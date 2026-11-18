import { test, expect } from '@playwright/test'
import path from 'node:path'

const hojas_de_estilo = [
  { nombre: 'web-admin', ruta: '../src/styles.css' }
]

const html_minimo = `
  <main>
    <button type="button">Botón</button>
    <a href="#">Enlace</a>
    <a href="#" class="btn btn-primary">Enlace botón</a>
    <input class="form-control" aria-label="Campo" />
  </main>`

for (const { nombre, ruta } of hojas_de_estilo) {
  test(`${nombre}: los elementos interactivos muestran un indicador de foco visible`, async ({ page }) => {
    await page.setContent(html_minimo)
    await page.addStyleTag({ path: path.resolve(__dirname, ruta) })

    for (const descripcion of ['button', 'a', 'a.btn', 'input.form-control']) {
      await page.keyboard.press('Tab')
      const estilo = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const cs = getComputedStyle(el)
        return { tag: el.tagName, clase: el.className, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth }
      })
      expect(estilo.outlineStyle, `${descripcion} sin outline visible`).not.toBe('none')
      expect(parseFloat(estilo.outlineWidth), `${descripcion} con outline de 0px`).toBeGreaterThan(0)
    }
  })
}
