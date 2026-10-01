import { supabase } from './supabase'

const BUCKET = 'catalog-assets'
const MAX_BYTES = 5 * 1024 * 1024
const MAX_SIDE = 1600
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export const ACCEPT_ATTR = ACCEPTED.join(',')

// Reduce la imagen a 1600 px y la convierte a WebP. Si algo falla, devuelve el original.
async function prepare(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
    if (!blob || blob.type !== 'image/webp') return file
    return new File([blob], 'image.webp', { type: 'image/webp' })
  } catch {
    return file
  }
}

export function validateImage(file: File): string | null {
  return ACCEPTED.includes(file.type) ? null : 'Usa una imagen JPG, PNG o WebP.'
}

export async function uploadProductImage(orgId: string, original: File): Promise<string> {
  const invalid = validateImage(original)
  if (invalid) throw new Error(invalid)
  const file = await prepare(original)
  if (file.size > MAX_BYTES) throw new Error('La imagen pesa más de 5 MB incluso después de optimizarla.')

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '31536000' })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Solo borra imágenes que están en nuestro bucket; las URLs externas se ignoran
export async function deleteStoredImage(url: string | null | undefined) {
  if (!url) return
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0])
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.error('No se pudo borrar la imagen', error)
}