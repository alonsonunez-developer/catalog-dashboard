import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/lib/supabase', () => ({ supabase: {} }))

import {
  SLUG_RE,
  attributeKey,
  errorMessage,
  slugify,
  starterPage,
  toRendererData,
  type Product,
} from '../src/lib/data'
import type { Organization } from '../src/lib/session'

const org: Organization = {
  id: 'o1',
  name: 'Dulce Hogar',
  currency: 'MXN',
  business: { tagline: 'Pasteles', phone: '', logo: 'https://x.test/logo.webp' },
  attribute_defs: [{ key: 'talla', label: 'Tallas', type: 'list' }],
  brand_theme: null,
}

const product = (o: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pastel',
  price: 450,
  compare_at_price: null,
  sku: null,
  description: null,
  image_url: null,
  gallery: [],
  attributes: {},
  category_id: null,
  is_active: true,
  position: 0,
  ...o,
})

describe('slugify', () => {
  it('quita acentos, símbolos y guiones sobrantes', () => {
    expect(slugify('Joyería Elegante 2026!')).toBe('joyeria-elegante-2026')
    expect(slugify('  --Ñandú & Co--  ')).toBe('nandu-co')
  })
  it('limita a 60 caracteres', () => {
    expect(slugify('a'.repeat(100))).toHaveLength(60)
  })
  it('lo que genera cumple SLUG_RE, y SLUG_RE rechaza lo inválido', () => {
    expect(SLUG_RE.test(slugify('Mi Catálogo Nº 1'))).toBe(true)
    for (const bad of ['', 'Mayús', 'con espacio', '-a', 'a-', 'a--b']) expect(SLUG_RE.test(bad)).toBe(false)
  })
})

describe('attributeKey', () => {
  it('genera una clave técnica a partir del nombre', () => {
    expect(attributeKey('Tamaños', new Set())).toBe('tamanos')
    expect(attributeKey('Color principal', new Set())).toBe('color_principal')
  })
  it('evita repetidos', () => {
    expect(attributeKey('Tallas', new Set(['tallas', 'tallas_2']))).toBe('tallas_3')
  })
  it('una clave no puede empezar con número ni quedar vacía', () => {
    expect(attributeKey('3D', new Set())).toBe('a_3d')
    expect(attributeKey('!!!', new Set())).toBe('atributo')
  })
})

describe('errorMessage', () => {
  it('extrae el texto de errores, objetos y cadenas', () => {
    expect(errorMessage(new Error('uno'))).toBe('uno')
    expect(errorMessage({ message: 'dos' })).toBe('dos')
    expect(errorMessage('tres')).toBe('tres')
  })
})

describe('toRendererData', () => {
  it('solo incluye los productos visibles y convierte los nombres de campo', () => {
    const out = toRendererData(
      org,
      [{ id: 'c1', name: 'Pasteles', position: 0 }],
      [
        product({
          id: 'a',
          compare_at_price: 520,
          sku: 'PF',
          description: 'd',
          image_url: 'u1',
          gallery: ['u2'],
          category_id: 'c1',
          attributes: { talla: ['S'] },
        }),
        product({ id: 'b', is_active: false }),
      ],
    )
    expect(out.products).toHaveLength(1)
    expect(out.products[0]).toEqual({
      id: 'a',
      name: 'Pastel',
      price: 450,
      compareAtPrice: 520,
      sku: 'PF',
      description: 'd',
      image: 'u1',
      images: ['u1', 'u2'],
      categoryId: 'c1',
      attributes: { talla: ['S'] },
    })
    expect(out.categories).toEqual([{ id: 'c1', name: 'Pasteles' }])
    expect(out.attributeDefs).toEqual(org.attribute_defs)
  })

  it('un producto sin datos opcionales no manda campos vacíos', () => {
    const [p] = toRendererData(org, [], [product()]).products
    expect(p).toEqual({ id: 'p1', name: 'Pastel', price: 450, images: [], attributes: {} })
  })

  it('el negocio lleva el nombre de la organización y omite textos vacíos', () => {
    const out = toRendererData({ ...org, business: { ...org.business, name: 'Otro' } }, [], [])
    expect(out.business).toEqual({ tagline: 'Pasteles', logo: 'https://x.test/logo.webp', name: 'Dulce Hogar' })
  })

  it('pasa el tema de marca solo si existe', () => {
    expect(toRendererData(org, [], []).brandTheme).toBeUndefined()
  })
})

describe('starterPage', () => {
  it('crea una página larga con el título en la portada', () => {
    const p = starterPage('Mi catálogo')
    expect(p.version).toBe(1)
    expect(p.sections.map((s) => s.type)).toEqual(['Hero', 'CategoryList', 'ProductGrid', 'Footer'])
    expect(p.sections[0].props.title).toBe('Mi catálogo')
  })
})