import { beforeEach, describe, expect, it, vi } from 'vitest'

const { remove, from } = vi.hoisted(() => {
  const remove = vi.fn()
  const from = vi.fn(() => ({ remove }))
  return { remove, from }
})
vi.mock('../src/lib/supabase', () => ({ supabase: { storage: { from } } }))

import { deleteStoredImage, validateImage } from '../src/lib/storage'

const BASE = 'https://x.supabase.co/storage/v1/object/public/catalog-assets/'

beforeEach(() => {
  remove.mockReset()
  remove.mockResolvedValue({ error: null })
  from.mockClear()
})

describe('validateImage', () => {
  it('acepta JPG, PNG y WebP y rechaza el resto', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validateImage({ type } as File)).toBeNull()
    }
    for (const type of ['image/svg+xml', 'application/pdf', 'image/gif', '']) {
      expect(validateImage({ type } as File)).toMatch(/JPG, PNG o WebP/)
    }
  })
})

describe('deleteStoredImage', () => {
  it('no hace nada sin URL o con URLs externas', async () => {
    await deleteStoredImage(null)
    await deleteStoredImage('')
    await deleteStoredImage('https://picsum.photos/seed/a/600/600')
    expect(remove).not.toHaveBeenCalled()
  })

  it('borra la ruta dentro del bucket, sin parámetros de la URL, y también su versión alta', async () => {
    await deleteStoredImage(`${BASE}org-1/abc.webp?v=3`)
    expect(from).toHaveBeenCalledWith('catalog-assets')
    expect(remove).toHaveBeenCalledWith(['org-1/abc.webp', 'org-1/abc-hd.webp'])
  })

  it('decodifica la ruta', async () => {
    await deleteStoredImage(`${BASE}org%201/a%20b.webp`)
    expect(remove).toHaveBeenCalledWith(['org 1/a b.webp', 'org 1/a b-hd.webp'])
  })

  it('si Storage falla, lo registra y no lanza', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    remove.mockResolvedValue({ error: new Error('boom') })
    await expect(deleteStoredImage(`${BASE}org-1/abc.webp`)).resolves.toBeUndefined()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})