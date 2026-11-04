<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 5 })
</script>

<template>
  <div class="card space-y-3 !p-4" role="status" aria-label="Cargando">
    <div v-for="i in rows" :key="i" class="h-6 animate-pulse rounded bg-neutral-200" :style="{ width: `${92 - (i % 3) * 14}%` }" />
  </div>
</template>