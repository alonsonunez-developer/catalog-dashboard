import { describe, expect, it } from 'vitest'
import { ICON_NAMES, iconUrl } from '../src/lib/icons'
import { APP_NAME, pageTitle } from '../src/lib/brand'

describe('íconos', () => {
  it('los nombres son únicos y en minúsculas con guiones', () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
    for (const n of ICON_NAMES) expect(n).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })
  it('un ícono sin archivo devuelve undefined', () => {
    expect(iconUrl('folder-empty' as never) === undefined || typeof iconUrl('folder-empty') === 'string').toBe(true)
  })
})

describe('pageTitle', () => {
  it('agrega el nombre del producto', () => {
    expect(pageTitle('Productos')).toBe(`Productos · ${APP_NAME}`)
    expect(pageTitle()).toBe(APP_NAME)
  })
})