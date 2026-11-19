import { toTableDto, validateTableForm, type TableFormValue } from './table-form.validation'

function formulario(datos: Partial<TableFormValue> = {}): TableFormValue {
  return { number: 1, capacity: 4, description: '', status: 'libre', reservedByClientId: '', ...datos }
}

describe('validateTableForm', () => {
  it('un formulario válido no tiene errores', () => {
    expect(validateTableForm(formulario())).toEqual({})
  })

  it.each([null, 0, -1, 2.5, Number.NaN])('número %s no es válido', numero => {
    expect(validateTableForm(formulario({ number: numero })).number)
      .toBe('El número de mesa debe ser un entero mayor que 0')
  })

  it.each([null, 0, -3, 1.5])('capacidad %s no es válida', capacidad => {
    expect(validateTableForm(formulario({ capacity: capacidad })).capacity)
      .toBe('La capacidad debe ser un entero mayor que 0')
  })

  it('el cliente es obligatorio solo con estado reservada', () => {
    expect(validateTableForm(formulario({ status: 'reservada' })).reservedByClientId)
      .toBe('Selecciona el cliente de la reserva')
    expect(validateTableForm(formulario({ status: 'reservada', reservedByClientId: 'c-1' }))).toEqual({})
    expect(validateTableForm(formulario({ status: 'ocupada' }))).toEqual({})
  })
})

describe('toTableDto', () => {
  it('envía number y capacity como números y la descripción vacía como null', () => {
    expect(toTableDto(formulario({ number: 3, capacity: 6, description: '   ' }))).toEqual({
      number: 3, capacity: 6, description: null, status: 'libre', reservedByClientId: null
    })
  })

  it('recorta la descripción', () => {
    expect(toTableDto(formulario({ description: '  Terraza ' })).description).toBe('Terraza')
  })

  it('convierte a número si el valor llega como texto', () => {
    const dto = toTableDto(formulario({ number: '7' as unknown as number, capacity: '2' as unknown as number }))
    expect(dto.number).toBe(7)
    expect(dto.capacity).toBe(2)
  })

  it('solo envía el cliente si la mesa queda reservada', () => {
    expect(toTableDto(formulario({ status: 'reservada', reservedByClientId: 'c-1' })).reservedByClientId).toBe('c-1')
    expect(toTableDto(formulario({ status: 'libre', reservedByClientId: 'c-1' })).reservedByClientId).toBeNull()
    expect(toTableDto(formulario({ status: 'ocupada', reservedByClientId: 'c-1' })).reservedByClientId).toBeNull()
  })
})
