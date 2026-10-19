import { supabase } from './supabase'
import { hdName } from './hdImages'

const BUCKET = 'catalog-assets'
const MAX_BYTES = 5 * 1024 * 1024 // límite del bucket
const MAX_SIDE = 1600
const HD_SIDE = 3600
const HD_MIN_SOURCE = 1700 // con un original más chico, la versión alta sería igual a la normal
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export const ACCEPT_ATTR = ACCEPTED.join(',')

// Dibuja el bitmap reducido por "scale" y lo convierte a WebP (conserva la transparencia)
async function render(bitmap: ImageBitmap, scale: number, quality: number): Promise<File | null> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob || blob.type !== 'image/webp') return null
  return new File([blob], 'image.webp', { type: 'image/webp' })
}

interface Prepared {
  standard: File
  hd: File | null
}

// Versión normal (hasta maxSide) y, si el original es grande, una versión alta (hasta 3600 px).
// Si algo falla, devuelve el original como versión normal.
async function prepare(file: File, maxSide: number, withHd: boolean): Promise<Prepared> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const longest = Math.max(bitmap.width, bitmap.height)
      const standard = (await render(bitmap, Math.min(1, maxSide / longest), 0.85)) ?? file
      let hd: File | null = null
      if (withHd && longest > HD_MIN_SOURCE) {
        const scale = Math.min(1, HD_SIDE / longest)
        hd = await render(bitmap, scale, 0.85)
        if (hd && hd.size > MAX_BYTES) hd = await render(bitmap, scale, 0.7)
        if (hd && hd.size > MAX_BYTES) hd = null
      }
      return { standard, hd }
    } finally {
      bitmap.close()
    }
  } catch {
    return { standard: file, hd: null }
  }
}

export function validateImage(file: File): string | null {
  return ACCEPTED.includes(file.type) ? null : 'Usa una imagen JPG, PNG o WebP.'
}

export interface UploadOptions {
  maxSide?: number // lado mayor de la versión normal (por defecto 1600)
  hd?: boolean // guardar también una versión alta para imprimir (por defecto sí)
}

export async function uploadProductImage(orgId: string, original: File, opts: UploadOptions = {}): Promise<string> {
  const invalid = validateImage(original)
  if (invalid) throw new Error(invalid)
  const { standard, hd } = await prepare(original, opts.maxSide ?? MAX_SIDE, opts.hd ?? true)
  if (standard.size > MAX_BYTES) throw new Error('La imagen pesa más de 5 MB incluso después de optimizarla.')

  const ext = standard.type === 'image/webp' ? 'webp' : standard.type === 'image/png' ? 'png' : 'jpg'
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, standard, { contentType: standard.type, cacheControl: '31536000' })
  if (error) throw error

  // La versión alta es opcional: si falla, la imagen normal sigue funcionando
  const hdPath = hd ? hdName(path) : null
  if (hd && hdPath) {
    const { error: e } = await supabase.storage
      .from(BUCKET)
      .upload(hdPath, hd, { contentType: 'image/webp', cacheControl: '31536000' })
    if (e) console.warn('No se pudo guardar la versión de alta resolución', e)
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// La subida no es específica de productos: se usa también para portadas y para el logo
export const uploadImage = uploadProductImage

// Solo borra imágenes que están en nuestro bucket; las URLs externas se ignoran.
// Borra también la versión alta, si existe.
export async function deleteStoredImage(url: string | null | undefined) {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  const hd = hdName(path)
  const { error } = await supabase.storage.from(BUCKET).remove(hd ? [path, hd] : [path])
  if (error) console.error('No se pudo borrar la imagen', error)
}