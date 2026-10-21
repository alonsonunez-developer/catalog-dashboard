import { describe, expect, it } from 'vitest'
import { formatShortcut, visibleItems, type MenuItem } from '../src/lib/menu'

const sep: MenuItem = { separator: true }
const item = (label: string, extra: Partial<MenuItem> = {}): MenuItem => ({ label, ...extra })
const labels = (items: MenuItem[]) => items.map((i) => (i.separator ? '—' : i.label))

describe('visibleItems', () => {
  it('quita lo oculto y conserva lo deshabilitado', () => {
    const out = visibleItems([item('a'), item('b', { hidden: true }), item('c', { disabled: true })])
    expect(labels(out)).toEqual(['a', 'c'])
  })

  it('no deja separadores al inicio, al final ni consecutivos', () => {
    const out = visibleItems([sep, item('a'), sep, sep, item('b'), sep])
    expect(labels(out)).toEqual(['a', '—', 'b'])
  })

  it('si se ocultan todos los elementos de un grupo, el separador desaparece', () => {
    const out = visibleItems([item('a'), sep, item('x', { hidden: true }), sep, item('b')])
    expect(labels(out)).toEqual(['a', '—', 'b'])
  })

  it('un menú vacío o solo con separadores queda vacío', () => {
    expect(visibleItems([])).toEqual([])
    expect(visibleItems([sep, sep])).toEqual([])
  })
})

describe('formatShortcut', () => {
  it('usa símbolos en Mac y nombres en el resto', () => {
    expect(formatShortcut('Mod+S', true)).toBe('⌘S')
    expect(formatShortcut('Mod+Shift+Z', true)).toBe('⌘⇧Z')
    expect(formatShortcut('Mod+S', false)).toBe('Ctrl+S')
    expect(formatShortcut('Mod+Shift+Z', false)).toBe('Ctrl+Shift+Z')
  })
})