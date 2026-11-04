<script setup lang="ts">
defineProps<{ title: string; text?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
    <AppIcon name="folder-empty" :size="40" class="text-neutral-400" />
    <p class="font-medium text-neutral-800">{{ title }}</p>
    <p v-if="text" class="max-w-sm text-sm text-neutral-500">{{ text }}</p>
    <div class="mt-2"><slot /></div>
  </div>
</template>