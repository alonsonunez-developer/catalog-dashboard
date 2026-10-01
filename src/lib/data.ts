import { supabase } from './supabase'
import type { Organization } from './session'

export interface Category {
  id: string
  name: string
  position: number
}

export interface Product {
  id: string
  name: string
  price: number
  description: string | null
  image_url: string | null
  category_id: string | null
  is_active: boolean
  position: number
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export async function fetchCategories(orgId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, position')
    .eq('organization_id', orgId)
    .order('position')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchProducts(orgId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, description, image_url, category_id, is_active, position')
    .eq('organization_id', orgId)
    .order('position')
    .order('name')
  if (error) throw error
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) }))
}

// Convierte los datos de la base a la forma que espera PageRenderer
export function toRendererData(org: Organization, categories: Category[], products: Product[]) {
  const business = Object.fromEntries(
    Object.entries({ ...org.business, name: org.name }).filter(([, v]) => typeof v === 'string' && v !== ''),
  )
  return {
    currency: org.currency,
    business,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    products: products
      .filter((p) => p.is_active)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description ?? undefined,
        image: p.image_url ?? undefined,
        categoryId: p.category_id ?? undefined,
      })),
  }
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function starterPage(title: string) {
  return {
    version: 1,
    theme: 'joyeria',
    sections: [
      { id: 'hero', type: 'Hero', props: { title, subtitle: '', buttonLabel: 'Ver productos' } },
      { id: 'categorias', type: 'CategoryList', props: { showCount: true } },
      { id: 'productos', type: 'ProductGrid', props: { title: 'Productos', columns: 3 } },
      { id: 'pie', type: 'Footer', props: {} },
    ],
  }
}