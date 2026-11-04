// Cambia aquí el nombre del producto: se usa en el encabezado y en el título de la pestaña
export const APP_NAME = 'Catálogo Digital'

const logos = import.meta.glob<string>('../assets/brand/logo.{svg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})
// Logo del producto (opcional): src/assets/brand/logo.svg
export const brandLogoUrl: string | undefined = Object.values(logos)[0]

export const pageTitle = (title?: string) => (title ? `${title} · ${APP_NAME}` : APP_NAME)