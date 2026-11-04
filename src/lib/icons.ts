export const ICON_NAMES = [
  'catalogs', 'products', 'categories', 'attributes', 'settings', 'logout',
  'plus', 'edit', 'trash', 'copy', 'eye', 'eye-off', 'link', 'search', 'upload',
  'check', 'alert', 'info', 'close', 'more', 'folder-empty', 'back', 'ellipsis-vertical'
] as const
export type IconName = (typeof ICON_NAMES)[number]

const files = import.meta.glob<string>('../assets/icons/*.{svg,png}', {
  eager: true,
  query: '?url',
  import: 'default',
})

const map: Record<string, string> = {}
for (const [path, url] of Object.entries(files)) {
  map[path.split('/').pop()!.replace(/\.(svg|png)$/, '')] = url
}

export const iconUrl = (name: IconName): string | undefined => map[name]

if (import.meta.env.DEV) {
  const missing = ICON_NAMES.filter((n) => !map[n])
  if (missing.length) console.info(`[íconos] faltan ${missing.length}: ${missing.join(', ')}`)
}