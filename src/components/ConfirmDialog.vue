<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { confirmState, resolveConfirm } from '../lib/confirm'

const cancelBtn = ref<HTMLButtonElement | null>(null)
const okBtn = ref<HTMLButtonElement | null>(null)
let previous: HTMLElement | null = null

watch(
  () => confirmState.open,
  async (open) => {
    if (open) {
      previous = document.activeElement as HTMLElement | null
      await nextTick()
      // En acciones destructivas el foco inicial va en "Cancelar"
      ;(confirmState.danger ? cancelBtn.value : okBtn.value)?.focus()
    } else {
      previous?.focus?.()
      previous = null
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (!confirmState.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    resolveConfirm(false)
    return
  }
  // El foco se queda dentro del cuadro
  if (e.key === 'Tab') {
    const first = cancelBtn.value
    const last = okBtn.value
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="dlg">
    <div
      v-if="confirmState.open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="resolveConfirm(false)"
    >
      <div
        class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        aria-describedby="dlg-message"
      >
        <h2 id="dlg-title" class="text-lg font-semibold text-neutral-900">{{ confirmState.title }}</h2>
        <p id="dlg-message" class="mt-2 whitespace-pre-line text-sm text-neutral-600">{{ confirmState.message }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button ref="cancelBtn" type="button" class="btn btn-secondary" @click="resolveConfirm(false)">
            {{ confirmState.cancelText }}
          </button>
          <button
            ref="okBtn"
            type="button"
            class="btn"
            :class="confirmState.danger ? 'bg-red-600 text-white hover:bg-red-700' : 'btn-primary'"
            @click="resolveConfirm(true)"
          >
            {{ confirmState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dlg-enter-active,
.dlg-leave-active {
  transition: opacity 0.15s ease;
}
.dlg-enter-from,
.dlg-leave-to {
  opacity: 0;
}
</style>