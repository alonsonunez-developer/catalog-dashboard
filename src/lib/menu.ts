export interface MenuItem {
  label?: string
  action?: () => void
  shortcut?: string // por ejemplo 'Mod+S' o 'Mod+Shift+Z'
  disabled?: boolean
  checked?: boolean // si está definido, el elemento es una casilla
  hidden?: boolean
  separator?: boolean
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

export function formatShortcut(shortcut: string, mac: boolean): string {
  const parts = shortcut.split('+')
  if (mac) return parts.map((p) => (p === 'Mod' ? '⌘' : p === 'Shift' ? '⇧' : p)).join('')
  return parts.map((p) => (p === 'Mod' ? 'Ctrl' : p)).join('+')
}