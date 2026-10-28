import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/supabase', () => ({ supabase: {} }))

import { SLUG_RE } from '../src/lib/data'
import { copySlug } from '../src/lib/catalogs'

describe('copySlug', () => {
  it('agrega -copia y luego -copia-N', () => {
    expect(copySlug('dulce-hogar', 1)).toBe('dulce-hogar-copia')
    expect(copySlug('dulce-hogar', 2)).toBe('dulce-hogar-copia-2')
    expect(copySlug('dulce-hogar', 12)).toBe('dulce-hogar-copia-12')
  })

  it('nunca pasa de 60 caracteres y siempre es un slug válido', () => {
    for (const base of ['a'.repeat(60), `${'a'.repeat(53)}-bbbbbb`, `${'a'.repeat(48)}-${'b'.repeat(11)}`]) {
      for (const n of [1, 2, 10, 30]) {
        const s = copySlug(base, n)
        expect(s.length, `${base} ${n}`).toBeLessThanOrEqual(60)
        expect(SLUG_RE.test(s), s).toBe(true)
      }
    }
  })

  it('cada intento da una dirección distinta', () => {
    const all = Array.from({ length: 30 }, (_, i) => copySlug('x'.repeat(60), i + 1))
    expect(new Set(all).size).toBe(30)
  })
})