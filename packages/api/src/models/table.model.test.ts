import { describe, it, expect } from 'vitest'
import { normalizeTableStatus, VALID_TABLE_STATUSES } from '@models/table.model.js'
import {
    TableNotFoundError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    InvalidPeopleCountError,
    TableOccupiedError,
    TableNotAvailableError,
    InvalidReservationClientError
} from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('acepta los estados válidos', () => {
        expect(VALID_TABLE_STATUSES).toEqual(['libre', 'ocupada', 'reservada'])
        expect(normalizeTableStatus('libre')).toBe('libre')
        expect(normalizeTableStatus('ocupada')).toBe('ocupada')
        expect(normalizeTableStatus('reservada')).toBe('reservada')
    })

    it('recorta y pasa a minúsculas', () => {
        expect(normalizeTableStatus(' OCUPADA ')).toBe('ocupada')
    })

    it('lanza InvalidTableStatusError con vacío, desconocido o no string', () => {
        expect(() => normalizeTableStatus('')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('   ')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus('rota')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(undefined)).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(3)).toThrow(InvalidTableStatusError)
    })
})

describe('errores de dominio de mesas', () => {
    it.each([
        [TableNotFoundError, 'TableNotFoundError', 'Mesa no encontrada'],
        [InvalidTableNumberError, 'InvalidTableNumberError', 'El número de mesa debe ser un entero mayor que 0'],
        [InvalidTableCapacityError, 'InvalidTableCapacityError', 'La capacidad debe ser un entero mayor que 0'],
        [InvalidTableStatusError, 'InvalidTableStatusError', 'Estado de mesa inválido. Debe ser libre, ocupada o reservada'],
        [DuplicatedTableNumberError, 'DuplicatedTableNumberError', 'Ya existe una mesa con ese número en este restaurante'],
        [InvalidPeopleCountError, 'InvalidPeopleCountError', 'El número de personas debe ser un entero mayor que 0'],
        [TableOccupiedError, 'TableOccupiedError', 'No se puede eliminar una mesa ocupada'],
        [TableNotAvailableError, 'TableNotAvailableError', 'La mesa ya no está disponible'],
        [InvalidReservationClientError, 'InvalidReservationClientError', 'Una mesa reservada necesita un cliente válido']
    ])('%o tiene nombre y mensaje en español', (ErrorClass, name, message) => {
        const error = new ErrorClass()
        expect(error.name).toBe(name)
        expect(error.message).toBe(message)
    })
})
