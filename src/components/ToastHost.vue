<script setup lang="ts">
import { dismissToast, pauseToast, resumeToast, toasts } from '../lib/toast'

const styles = {
  success: 'border-green-300 bg-green-50 text-green-900',
  error: 'border-red-300 bg-red-50 text-red-900',
  info: 'border-neutral-300 bg-white text-neutral-900',
} as const
const icons = { success: '✓', error: '!', info: 'i' } as const
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-stretch gap-2 sm:left-auto sm:w-96"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border p-3 text-sm shadow-lg"
        :class="styles[t.kind]"
        :role="t.kind === 'error' ? 'alert' : 'status'"
        @mouseenter="pauseToast(t.id)"
        @mouseleave="resumeToast(t.id)"
      >
        <span
          class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-xs font-bold"
          aria-hidden="true"
        >
          {{ icons[t.kind] }}
        </span>
        <p class="min-w-0 flex-1 break-words">{{ t.message }}</p>
        <button
          type="button"
          class="shrink-0 cursor-pointer rounded px-1 text-neutral-500 hover:text-neutral-900"
          aria-label="Cerrar aviso"
          @click="dismissToast(t.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  left: 0;
}
@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>