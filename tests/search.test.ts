import { describe, expect, it } from 'vitest'
import { matchesQuery, normalize } from '../src/lib/search'

describe('normalize', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalize('  JOYERÍA Ñandú ')).toBe('joyeria nandu')
  })
})

describe('matchesQuery', () => {
  it('una búsqueda vacía coincide con todo', () => {
    expect(matchesQuery('', ['x'])).toBe(true)
    expect(matchesQuery('   ', [])).toBe(true)
  })
  it('ignora acentos y mayúsculas', () => {
    expect(matchesQuery('joyeria', ['Joyería Elegante'])).toBe(true)
    expect(matchesQuery('BOTAS', ['botas café'])).toBe(true)
  })
  it('todas las palabras deben aparecer, en cualquier orden y en campos distintos', () => {
    expect(matchesQuery('dama botas', ['Botas Café Dama'])).toBe(true)
    expect(matchesQuery('botas BCD', ['Botas Café Dama', 'BCD'])).toBe(true)
    expect(matchesQuery('botas caballero', ['Botas Café Dama'])).toBe(false)
  })
  it('ignora campos vacíos o nulos', () => {
    expect(matchesQuery('zapato', [null, undefined, '', 'Zapato clásico'])).toBe(true)
    expect(matchesQuery('algo', [null, undefined])).toBe(false)
  })
  it('encuentra por estado', () => {
    expect(matchesQuery('borrador', ['Mi catálogo', 'mi-catalogo', 'borrador'])).toBe(true)
    expect(matchesQuery('publicado', ['Mi catálogo', 'mi-catalogo', 'borrador'])).toBe(false)
  })
})