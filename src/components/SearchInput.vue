<script setup lang="ts">
const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string; label?: string }>()
</script>

<template>
  <div class="relative">
    <svg
      class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path stroke-linecap="round" d="m20 20-3.5-3.5" />
    </svg>
    <input
      v-model="model"
      type="search"
      class="input !pl-9 !pr-9"
      :placeholder="placeholder ?? 'Buscar…'"
      :aria-label="label ?? placeholder ?? 'Buscar'"
      autocomplete="off"
      @keydown.esc="model = ''"
    />
    <button
      v-if="model"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-1.5 text-neutral-500 hover:text-neutral-900"
      aria-label="Limpiar búsqueda"
      @click="model = ''"
    >
      ✕
    </button>
  </div>
</template>