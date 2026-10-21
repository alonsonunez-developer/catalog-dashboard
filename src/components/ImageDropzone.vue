<script setup lang="ts">
import { ref } from 'vue'
import { ACCEPT_ATTR } from '../lib/storage'

const props = defineProps<{
  src?: string
  busy?: boolean
  disabled?: boolean
  hint?: string
}>()
const emit = defineEmits<{ file: [file: File]; remove: [] }>()

const input = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
let depth = 0 // dragenter/dragleave se disparan también al pasar por los elementos hijos

const blocked = () => !!props.disabled || !!props.busy

function pick() {
  if (!blocked()) input.value?.click()
}

function onChange(ev: Event) {
  const el = ev.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (file) emit('file', file)
}

function onEnter(ev: DragEvent) {
  if (blocked() || !ev.dataTransfer?.types.includes('Files')) return
  depth++
  dragging.value = true
}
function onLeave() {
  depth = Math.max(0, depth - 1)
  if (!depth) dragging.value = false
}
function onDrop(ev: DragEvent) {
  depth = 0
  dragging.value = false
  if (blocked()) return
  const file = ev.dataTransfer?.files?.[0]
  if (file) emit('file', file)
}
</script>

<template>
  <div class="space-y-2">
    <input ref="input" type="file" :accept="ACCEPT_ATTR" class="sr-only" tabindex="-1" aria-hidden="true" @change="onChange" />

    <!-- Sin imagen: todo el recuadro es el botón -->
    <div
      v-if="!src"
      role="button"
      :tabindex="blocked() ? -1 : 0"
      :aria-disabled="blocked()"
      class="relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-center transition"
      :class="[
        dragging ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-300 bg-neutral-50 hover:border-neutral-500 hover:bg-neutral-100',
        blocked() ? 'cursor-not-allowed opacity-60' : '',
      ]"
      @click="pick"
      @keydown.enter.prevent="pick"
      @keydown.space.prevent="pick"
      @dragenter.prevent="onEnter"
      @dragover.prevent
      @dragleave="onLeave"
      @drop.prevent="onDrop"
    >
      <svg class="h-8 w-8 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span class="text-sm font-medium text-neutral-800">
        {{ dragging ? 'Suelta la imagen aquí' : 'Haz clic para subir una imagen' }}
      </span>
      <span v-if="!dragging" class="text-xs text-neutral-500">o arrástrala y suéltala aquí</span>
      <div v-if="busy" class="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 text-sm text-neutral-700">
        Subiendo imagen…
      </div>
    </div>

    <!-- Con imagen: vista previa y botones -->
    <template v-else>
      <div
        class="relative overflow-hidden rounded-lg border-2 transition"
        :class="dragging ? 'border-dashed border-neutral-900' : 'border-transparent'"
        @dragenter.prevent="onEnter"
        @dragover.prevent
        @dragleave="onLeave"
        @drop.prevent="onDrop"
      >
        <img :src="src" alt="Vista previa de la imagen" class="h-36 w-full bg-neutral-100 object-cover" />
        <div v-if="dragging" class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
          Suelta para reemplazar
        </div>
        <div v-if="busy" class="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-neutral-700">
          Subiendo imagen…
        </div>
      </div>
      <div v-if="!disabled" class="flex gap-2">
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="pick">Cambiar imagen</button>
        <button type="button" class="btn btn-danger" :disabled="busy" @click="emit('remove')">Quitar</button>
      </div>
    </template>

    <p v-if="hint" class="text-xs text-neutral-500">{{ hint }}</p>
  </div>
</template>