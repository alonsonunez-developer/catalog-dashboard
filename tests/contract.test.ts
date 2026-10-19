// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { AttributeDefSchema, CatalogDataSchema, PageSchema } from 'catalog-kit'

vi.mock('../src/lib/supabase', () => ({ supabase: {} }))

import { attributeKey, starterPage, toRendererData } from '../src/lib/data'
import type { Organization } from '../src/lib/session'

describe('contrato dashboard ↔ catalog-kit', () => {
  it('la página inicial cumple el schema de páginas', () => {
    expect(PageSchema.safeParse(starterPage('Demo')).success).toBe(true)
  })

  it('las claves de atributos generadas cumplen el schema', () => {
    for (const label of ['Tallas', 'Tamaños', '3D', 'Ñandú', '!!!', 'Color principal', 'a b']) {
      const key = attributeKey(label, new Set())
      expect(AttributeDefSchema.safeParse({ key, label, type: 'text' }).success, label).toBe(true)
    }
  })

  it('los datos para el renderer cumplen el schema de datos', () => {
    const org: Organization = {
      id: 'o1',
      name: 'Dulce Hogar',
      currency: 'MXN',
      business: { whatsapp: '+52 636 000 0000', logo: 'https://x.test/l.webp' },
      attribute_defs: [{ key: 'talla', label: 'Tallas', type: 'list' }],
      brand_theme: null,
    }
    const data = toRendererData(
      org,
      [{ id: 'c1', name: 'Ropa', position: 0 }],
      [
        {
          id: 'p1',
          name: 'Chamarra',
          price: 899,
          compare_at_price: 1200,
          sku: 'CH1',
          description: null,
          image_url: 'https://x.test/a.webp',
          gallery: ['https://x.test/b.webp'],
          attributes: { talla: ['S', 'M'] },
          category_id: 'c1',
          is_active: true,
          position: 0,
        },
      ],
    )
    expect(CatalogDataSchema.safeParse(data).success).toBe(true)
  })
})