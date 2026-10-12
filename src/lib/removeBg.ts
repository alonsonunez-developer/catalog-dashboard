// Quita el fondo de una imagen en el navegador. Devuelve un PNG con transparencia.
// La librería (y su modelo) se cargan solo la primera vez que se usa.
export async function removeImageBackground(source: Blob, onProgress?: (pct: number) => void): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal')
  return removeBackground(source, {
    output: { format: 'image/png' },
    progress: (_key: string, current: number, total: number) => {
      if (total) onProgress?.(Math.min(100, Math.round((current / total) * 100)))
    },
  })
}