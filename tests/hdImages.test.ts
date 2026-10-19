import { describe, expect, it } from 'vitest'
import { hdName, hdUrl, neededPixels, wantsHd } from '../src/lib/hdImages'

const BASE = 'https://x.supabase.co/storage/v1/object/public/catalog-assets/'

describe('hdName', () => {
  it('cambia la extensión por -hd.webp', () => {
    expect(hdName('org/abc.webp')).toBe('org/abc-hd.webp')
    expect(hdName('org/abc.png')).toBe('org/abc-hd.webp')
  })
  it('no genera una versión alta de una versión alta ni de nombres sin extensión', () => {
    expect(hdName('org/abc-hd.webp')).toBeNull()
    expect(hdName('org/abc')).toBeNull()
  })
})

describe('hdUrl', () => {
  it('deduce la URL alta y conserva los parámetros', () => {
    expect(hdUrl(`${BASE}org/abc.webp`)).toBe(`${BASE}org/abc-hd.webp`)
    expect(hdUrl(`${BASE}org/abc.webp?v=2`)).toBe(`${BASE}org/abc-hd.webp?v=2`)
  })
  it('ignora imágenes externas y las que ya son altas', () => {
    expect(hdUrl('https://picsum.photos/seed/a/600/600')).toBeNull()
    expect(hdUrl(`${BASE}org/abc-hd.webp`)).toBeNull()
  })
})

describe('resolución necesaria', () => {
  it('300 DPI equivale a 3.125 píxeles por píxel CSS', () => {
    expect(neededPixels(96)).toBe(300)
    expect(neededPixels(960)).toBe(3000)
  })
  it('solo pide la versión alta cuando la normal se queda corta', () => {
    expect(wantsHd(900, 1600)).toBe(true) // ~2813 px necesarios
    expect(wantsHd(480, 1600)).toBe(false) // 1500 px necesarios
    expect(wantsHd(520, 1600)).toBe(false) // 1625 px: dentro del margen del 10 %
  })
})