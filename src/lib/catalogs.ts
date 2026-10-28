import { supabase } from './supabase'
import { SLUG_RE } from './data'

// "mi-catalogo" -> "mi-catalogo-copia", "mi-catalogo-copia-2"… sin pasar de 60 caracteres
export function copySlug(slug: string, n: number): string {
  const suffix = n <= 1 ? '-copia' : `-copia-${n}`
  return slug.slice(0, 60 - suffix.length).replace(/-+$/, '') + suffix
}

const NO_PERMISSION = 'No tienes permiso para modificar este catálogo.'

export async function unpublishCatalog(id: string) {
  const { data, error } = await supabase
    .from('catalogs')
    .update({ status: 'draft', published_page: null, published_at: null })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error(NO_PERMISSION)
}

export async function deleteCatalog(id: string) {
  const { data, error } = await supabase.from('catalogs').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.length) throw new Error(NO_PERMISSION)
}

export async function updateCatalogMeta(id: string, meta: { name: string; slug: string }) {
  const name = meta.name.trim()
  if (!name) throw new Error('El nombre no puede estar vacío.')
  if (!SLUG_RE.test(meta.slug) || meta.slug.length > 60) throw new Error('La dirección solo admite minúsculas, números y guiones.')
  const { data, error } = await supabase.from('catalogs').update({ name, slug: meta.slug }).eq('id', id).select('id')
  if (error) throw error.code === '23505' ? new Error('Esa dirección ya está en uso, elige otra.') : error
  if (!data?.length) throw new Error(NO_PERMISSION)
}

// Copia el borrador a un catálogo nuevo (en borrador). Devuelve el id de la copia.
export async function duplicateCatalog(id: string, organizationId: string): Promise<string> {
  const { data: src, error: e } = await supabase.from('catalogs').select('name, slug, draft_page').eq('id', id).single()
  if (e) throw e
  const name = `${src.name} (copia)`.slice(0, 120)
  for (let n = 1; n <= 30; n++) {
    const { data, error } = await supabase
      .from('catalogs')
      .insert({ organization_id: organizationId, name, slug: copySlug(src.slug, n), draft_page: src.draft_page })
      .select('id')
      .single()
    if (!error) return data.id
    if (error.code !== '23505') throw error // solo se reintenta cuando la dirección ya existe
  }
  throw new Error('No se pudo encontrar una dirección libre para la copia.')
}