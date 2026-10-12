import { reactive } from 'vue'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean // botón de confirmar en rojo y foco inicial en "Cancelar"
}

const defaults = { title: 'Confirmar', confirmText: 'Confirmar', cancelText: 'Cancelar', danger: false }

export const confirmState = reactive({ open: false, message: '', ...defaults })

let resolver: ((value: boolean) => void) | null = null

// Muestra el cuadro y devuelve true si el usuario confirma, false si cancela
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  resolver?.(false) // si ya había uno abierto, se cancela
  Object.assign(confirmState, { ...defaults, ...options, open: true })
  return new Promise((resolve) => {
    resolver = resolve
  })
}

export function resolveConfirm(value: boolean) {
  confirmState.open = false
  const r = resolver
  resolver = null
  r?.(value)
}