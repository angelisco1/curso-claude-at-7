import { TestBed } from '@angular/core/testing'
import { TableSelectionStore, TABLE_SELECTION_KEY } from './table-selection.store'
import { Table } from '../models/table.model'

const mesa: Table = {
  id: 'table-rest-1-2',
  restaurantId: 'rest-1',
  number: 2,
  description: 'Junto a la ventana',
  capacity: 2,
  status: 'ocupada',
  reservedByClientId: null,
  createdAt: '2026-11-19T10:00:00.000Z',
  updatedAt: '2026-11-19T10:00:00.000Z'
}

function crearStore(): TableSelectionStore {
  TestBed.resetTestingModule()
  return TestBed.inject(TableSelectionStore)
}

describe('TableSelectionStore', () => {
  beforeEach(() => sessionStorage.clear())

  it('empieza vacío', () => {
    const store = crearStore()
    expect(store.table()).toBeNull()
    expect(store.restaurantId()).toBeNull()
    expect(store.people()).toBeNull()
  })

  it('guarda el número de personas, el restaurante y la mesa', () => {
    const store = crearStore()
    store.select('rest-1', 2, mesa)

    expect(store.people()).toBe(2)
    expect(store.restaurantId()).toBe('rest-1')
    expect(store.table()).toEqual(mesa)
  })

  it('hasTableFor solo es verdadero para el restaurante de la mesa', () => {
    const store = crearStore()
    expect(store.hasTableFor('rest-1')).toBe(false)

    store.select('rest-1', 2, mesa)

    expect(store.hasTableFor('rest-1')).toBe(true)
    expect(store.hasTableFor('rest-2')).toBe(false)
    expect(store.hasTableFor(null)).toBe(false)
  })

  it('clear borra la selección', () => {
    const store = crearStore()
    store.select('rest-1', 2, mesa)

    store.clear()

    expect(store.table()).toBeNull()
    expect(store.hasTableFor('rest-1')).toBe(false)
    expect(sessionStorage.getItem(TABLE_SELECTION_KEY)).toBeNull()
  })

  it('persiste la selección en sessionStorage y la recupera al crearse', () => {
    crearStore().select('rest-1', 2, mesa)
    expect(sessionStorage.getItem(TABLE_SELECTION_KEY)).not.toBeNull()

    const recuperado = crearStore()

    expect(recuperado.table()).toEqual(mesa)
    expect(recuperado.people()).toBe(2)
    expect(recuperado.hasTableFor('rest-1')).toBe(true)
  })

  it('ignora un valor corrupto en sessionStorage', () => {
    sessionStorage.setItem(TABLE_SELECTION_KEY, '{no es json')
    const store = crearStore()
    expect(store.table()).toBeNull()
  })
})
