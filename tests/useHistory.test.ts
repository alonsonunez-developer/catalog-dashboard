import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useTextHistory } from '../src/lib/useHistory'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useTextHistory', () => {
  it('deshace y rehace', async () => {
    const text = ref('a')
    const h = useTextHistory(text)
    expect(h.canUndo.value).toBe(false)

    text.value = 'b'
    await nextTick()
    expect(h.canUndo.value).toBe(true)

    h.undo()
    expect(text.value).toBe('a')
    await nextTick()
    expect(h.canRedo.value).toBe(true)

    h.redo()
    expect(text.value).toBe('b')
  })

  it('agrupa los cambios seguidos en un solo paso', async () => {
    const text = ref('a')
    const h = useTextHistory(text, { wait: 500 })
    text.value = 'ab'
    await nextTick()
    text.value = 'abc'
    await nextTick()
    h.undo()
    expect(text.value).toBe('a')
    expect(h.canUndo.value).toBe(false)
  })

  it('los cambios separados por más de "wait" son pasos distintos', async () => {
    const text = ref('a')
    const h = useTextHistory(text, { wait: 500 })
    text.value = 'ab'
    await nextTick()
    vi.advanceTimersByTime(500)
    text.value = 'abc'
    await nextTick()
    h.undo()
    expect(text.value).toBe('ab')
    h.undo()
    expect(text.value).toBe('a')
  })

  it('un cambio nuevo después de deshacer borra el rehacer', async () => {
    const text = ref('a')
    const h = useTextHistory(text)
    text.value = 'b'
    await nextTick()
    h.undo()
    await nextTick()
    expect(h.canRedo.value).toBe(true)
    text.value = 'c'
    await nextTick()
    expect(h.canRedo.value).toBe(false)
  })

  it('reset toma el estado actual como punto de partida', async () => {
    const text = ref('')
    const h = useTextHistory(text)
    text.value = 'documento cargado'
    h.reset()
    await nextTick()
    expect(h.canUndo.value).toBe(false)
    h.undo()
    expect(text.value).toBe('documento cargado')
  })

  it('respeta el límite de pasos', async () => {
    const text = ref('0')
    const h = useTextHistory(text, { limit: 3, wait: 500 })
    for (let i = 1; i <= 5; i++) {
      text.value = String(i)
      await nextTick()
      vi.advanceTimersByTime(500)
    }
    h.undo()
    h.undo()
    h.undo()
    expect(text.value).toBe('2')
    expect(h.canUndo.value).toBe(false)
  })

  it('deshacer sin historial no hace nada', () => {
    const text = ref('a')
    const h = useTextHistory(text)
    h.undo()
    h.redo()
    expect(text.value).toBe('a')
  })
})