import { routes } from './app.routes'

describe('rutas de la app', () => {
  it('cuelga la feature de mesas de restaurants/:restaurantId/tables', () => {
    const shell = routes.find(r => r.path === '')
    const restaurante = shell?.children?.find(r => r.path === 'restaurants/:restaurantId')
    const mesas = restaurante?.children?.find(r => r.path === 'tables')
    expect(mesas?.loadChildren).toBeDefined()
  })
})
