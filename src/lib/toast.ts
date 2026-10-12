import { computed, reactive } from 'vue'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

export const toasts = reactive<ToastItem[]>([])

const DURATION: Record<ToastKind, number> = { success: 4000, info: 5000, error: 8000 }
const MAX_VISIBLE = 4
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let seq = 0

function schedule(id: number, ms: number) {
  clearTimeout(timers.get(id))
  timers.set(id, setTimeout(() => dismissToast(id), ms))
}

export function dismissToast(id: number) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  const i = toasts.findIndex((t) => t.id === id)
  if (i >= 0) toasts.splice(i, 1)
}

// Con el cursor encima el aviso no desaparece; al salir, queda 2 s más
export function pauseToast(id: number) {
  clearTimeout(timers.get(id))
}
export function resumeToast(id: number) {
  if (toasts.some((t) => t.id === id)) schedule(id, 2000)
}

function push(kind: ToastKind, message: string): number {
  const text = message.trim()
  if (!text) return -1
  // El mismo aviso que ya se muestra no se repite: solo reinicia su tiempo
  const same = toasts.find((t) => t.kind === kind && t.message === text)
  if (same) {
    schedule(same.id, DURATION[kind])
    return same.id
  }
  const id = ++seq
  toasts.push({ id, kind, message: text })
  while (toasts.length > MAX_VISIBLE) dismissToast(toasts[0].id)
  schedule(id, DURATION[kind])
  return id
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
}

// Referencia que lanza un aviso al asignarle un texto. Asignar '' no hace nada.
// Permite migrar `const error = ref('')` sin tocar el resto del código.
export function toastRef(kind: ToastKind) {
  return computed<string>({
    get: () => '',
    set: (value) => {
      if (value) push(kind, value)
    },
  })
}