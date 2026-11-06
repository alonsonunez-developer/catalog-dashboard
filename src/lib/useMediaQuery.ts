import { onBeforeUnmount, ref } from 'vue'

// true mientras la ventana cumple la media query (se actualiza al girar o redimensionar)
export function useMediaQuery(query: string) {
  const mql = typeof window !== 'undefined' ? window.matchMedia(query) : null
  const matches = ref(mql?.matches ?? false)
  const onChange = (e: MediaQueryListEvent) => (matches.value = e.matches)
  mql?.addEventListener('change', onChange)
  onBeforeUnmount(() => mql?.removeEventListener('change', onChange))
  return matches
}