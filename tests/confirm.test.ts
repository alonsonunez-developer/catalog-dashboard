import { describe, expect, it } from 'vitest'
import { confirmDialog, confirmState, resolveConfirm } from '../src/lib/confirm'

describe('confirmDialog', () => {
  it('abre el cuadro y devuelve true al confirmar', async () => {
    const p = confirmDialog({ message: '¿Eliminar?', danger: true, confirmText: 'Eliminar' })
    expect(confirmState).toMatchObject({ open: true, message: '¿Eliminar?', danger: true, confirmText: 'Eliminar' })
    resolveConfirm(true)
    expect(await p).toBe(true)
    expect(confirmState.open).toBe(false)
  })

  it('devuelve false al cancelar', async () => {
    const p = confirmDialog({ message: 'x' })
    resolveConfirm(false)
    expect(await p).toBe(false)
  })

  it('un cuadro nuevo cancela el anterior y vuelve a los valores por defecto', async () => {
    const first = confirmDialog({ message: 'uno', title: 'Título propio', danger: true })
    const second = confirmDialog({ message: 'dos' })
    expect(await first).toBe(false)
    expect(confirmState).toMatchObject({ message: 'dos', title: 'Confirmar', danger: false, open: true })
    resolveConfirm(true)
    expect(await second).toBe(true)
  })

  it('resolver sin cuadro abierto no rompe nada', () => {
    expect(() => resolveConfirm(true)).not.toThrow()
  })
})