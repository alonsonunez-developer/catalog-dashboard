export interface MenuItem {
  label?: string
  action?: () => void
  shortcut?: string // por ejemplo 'Mod+S' o 'Mod+Shift+Z'
  disabled?: boolean
  checked?: boolean // si está definido, el elemento es una casilla
  hidden?: boolean
  separator?: boolean
  children?: MenuItem[] // submenú
}
export interface Menu {
  label: string
  items: MenuItem[]
}

// Quita lo oculto y deja los separadores solo entre elementos (nunca al inicio, al final ni dobles)
export function visibleItems(items: MenuItem[]): MenuItem[] {
  const out: MenuItem[] = []
  for (const it of items.filter((i) => !i.hidden)) {
    if (it.separator && (!out.length || out[out.length - 1].separator)) continue
    out.push(it)
  }
  while (out.length && out[out.length - 1].separator) out.pop()
  return out
}

// Orden alfabético en español: ignora mayúsculas y acentos, y los números van por su valor (2 antes que 10)
export function sortedByLabel<T extends { label?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (a.label ?? '').localeCompare(b.label ?? '', 'es', { numeric: true, sensitivity: 'base' }),
  )
}

export function formatShortcut(shortcut: string, mac: boolean): string {
  const parts = shortcut.split('+')
  if (mac) return parts.map((p) => (p === 'Mod' ? '⌘' : p === 'Shift' ? '⇧' : p)).join('')
  return parts.map((p) => (p === 'Mod' ? 'Ctrl' : p)).join('+')
}