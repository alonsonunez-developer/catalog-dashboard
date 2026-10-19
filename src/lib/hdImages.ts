const MARKER = '/storage/v1/object/public/catalog-assets/'

// "org/abc.png" -> "org/abc-hd.webp". Devuelve null si ya es una versión alta o no tiene extensión.
export function hdName(name: string): string | null {
  if (/-hd\.webp$/.test(name)) return null
  const hd = name.replace(/\.[^./]+$/, '-hd.webp')
  return hd === name ? null : hd
}

// URL de la versión alta de una imagen de nuestro bucket; null para imágenes externas
export function hdUrl(url: string): string | null {
  const i = url.indexOf(MARKER)
  if (i === -1) return null
  const [clean, query] = url.split('?')
  const hd = hdName(clean)
  return hd ? hd + (query ? `?${query}` : '') : null
}

// Píxeles necesarios para mostrar un ancho (en píxeles CSS, 96 por pulgada) a cierta densidad
export const neededPixels = (cssWidth: number, dpi = 300) => Math.ceil((cssWidth * dpi) / 96)

// La versión normal no alcanza si le faltan más de un 10 % de píxeles
export const wantsHd = (cssWidth: number, naturalWidth: number, dpi = 300) =>
  neededPixels(cssWidth, dpi) > naturalWidth * 1.1