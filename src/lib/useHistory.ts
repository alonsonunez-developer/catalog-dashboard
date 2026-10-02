import { computed, ref, watch, type Ref } from 'vue'

// Historial de deshacer/rehacer sobre un texto. Los cambios seguidos (por ejemplo, teclear)
// dentro de "wait" ms se agrupan en un solo paso.
export function useTextHistory(text: Ref<string>, options: { limit?: number; wait?: number } = {}) {
  const limit = options.limit ?? 100
  const wait = options.wait ?? 500

  const past = ref<string[]>([])
  const future = ref<string[]>([])
  let committed = text.value // último estado registrado como punto del historial
  let timer: ReturnType<typeof setTimeout> | null = null

  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    committed = text.value
  }

  watch(text, (value) => {
    // Cambios que hicimos nosotros (undo/redo/reset) o que no cambian nada
    if (!timer && value === committed) return
    if (!timer) {
      past.value.push(committed)
      if (past.value.length > limit) past.value.shift()
      future.value = []
    } else {
      clearTimeout(timer)
    }
    timer = setTimeout(flush, wait)
  })

  function undo() {
    flush()
    let prev = past.value.pop()
    while (prev !== undefined && prev === text.value) prev = past.value.pop()
    if (prev === undefined) return
    future.value.push(text.value)
    text.value = prev
    committed = prev
  }

  function redo() {
    flush()
    let next = future.value.pop()
    while (next !== undefined && next === text.value) next = future.value.pop()
    if (next === undefined) return
    past.value.push(text.value)
    text.value = next
    committed = next
  }

  // Úsalo después de cargar el documento: el estado actual pasa a ser el punto de partida
  function reset() {
    if (timer) clearTimeout(timer)
    timer = null
    past.value = []
    future.value = []
    committed = text.value
  }

  return {
    undo,
    redo,
    reset,
    canUndo: computed(() => past.value.length > 0),
    canRedo: computed(() => future.value.length > 0),
  }
}