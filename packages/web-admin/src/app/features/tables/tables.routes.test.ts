import { TABLE_ROUTES } from './tables.routes'

describe('TABLE_ROUTES', () => {
  it('tiene listado y alta de mesas', () => {
    const rutas = TABLE_ROUTES.map(r => r.path)
    expect(rutas).toContain('')
    expect(rutas).toContain('new')
  })

  it('el alta carga el formulario de mesas', async () => {
    const alta = TABLE_ROUTES.find(r => r.path === 'new')
    const componente = await (alta?.loadComponent as () => Promise<unknown>)()
    expect((componente as { name: string }).name).toContain('TableFormComponent')
  })
})

describe('TABLE_ROUTES (edición)', () => {
  it('la edición carga el formulario de mesas', async () => {
    const edicion = TABLE_ROUTES.find(r => r.path === ':id/edit')
    expect(edicion).toBeDefined()
    const componente = await (edicion?.loadComponent as () => Promise<unknown>)()
    expect((componente as { name: string }).name).toContain('TableFormComponent')
  })
})
