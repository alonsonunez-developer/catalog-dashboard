import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, pauseToast, resumeToast, toast, toastRef, toasts } from '../src/lib/toast'

beforeEach(() => {
  vi.useFakeTimers()
  ;[...toasts].forEach((t) => dismissToast(t.id))
})
afterEach(() => {
  ;[...toasts].forEach((t) => dismissToast(t.id))
  vi.useRealTimers()
})

describe('toast', () => {
  it('el éxito desaparece a los 4 s y el error a los 8 s', () => {
    toast.success('Guardado')
    toast.error('Falló')
    vi.advanceTimersByTime(3999)
    expect(toasts).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(toasts.map((t) => t.message)).toEqual(['Falló'])
    vi.advanceTimersByTime(4000)
    expect(toasts).toHaveLength(0)
  })

  it('el mismo aviso no se duplica y reinicia su tiempo', () => {
    toast.success('Guardado')
    vi.advanceTimersByTime(3000)
    toast.success('Guardado')
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(toasts).toHaveLength(0)
  })

  it('el mismo texto con otro tipo sí es otro aviso', () => {
    toast.success('Listo')
    toast.error('Listo')
    expect(toasts).toHaveLength(2)
  })

  it('muestra como máximo 4 y descarta el más viejo', () => {
    for (const m of ['a', 'b', 'c', 'd', 'e']) toast.info(m)
    expect(toasts.map((t) => t.message)).toEqual(['b', 'c', 'd', 'e'])
  })

  it('ignora mensajes vacíos', () => {
    expect(toast.error('   ')).toBe(-1)
    expect(toasts).toHaveLength(0)
  })

  it('con el cursor encima no desaparece, y al salir queda 2 s más', () => {
    const id = toast.success('Guardado')
    pauseToast(id)
    vi.advanceTimersByTime(60_000)
    expect(toasts).toHaveLength(1)
    resumeToast(id)
    vi.advanceTimersByTime(1999)
    expect(toasts).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts).toHaveLength(0)
  })

  it('toastRef lanza un aviso al asignar texto y no al asignar vacío', () => {
    const error = toastRef('error')
    error.value = ''
    expect(toasts).toHaveLength(0)
    error.value = 'Algo salió mal'
    expect(toasts).toMatchObject([{ kind: 'error', message: 'Algo salió mal' }])
    expect(error.value).toBe('')
  })
})