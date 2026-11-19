import { routes } from './app.routes'

describe('rutas de la app', () => {
  it('incluye la ruta «mesas» dentro del shell con carga diferida', () => {
    const shell = routes.find(r => r.path === '' && r.children)
    const mesas = shell?.children?.find(r => r.path === 'mesas')
    expect(mesas?.loadComponent).toBeTypeOf('function')
  })
})
