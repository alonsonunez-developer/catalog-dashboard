// Minúsculas y sin acentos, para que "joyeria" encuentre "Joyería"
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Todas las palabras de la búsqueda deben aparecer en alguno de los campos (en cualquier orden)
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const haystack = normalize(fields.filter((f): f is string => !!f).join(' '))
  return terms.every((t) => haystack.includes(t))
}