<script setup lang="ts">
import { computed } from 'vue'
import { PageRenderer, type CatalogDataInput } from 'catalog-kit'

const props = withDefaults(defineProps<{ page: unknown; data: CatalogDataInput; index: number; width?: number }>(), {
  width: 130,
})

const INNER = 390 // ancho de un celular en el que se dibuja la página antes de reducirla
const scale = computed(() => props.width / INNER)
const height = computed(() => Math.round(props.width * 1.4))
</script>

<template>
  <div
    class="relative shrink-0 overflow-hidden rounded border border-neutral-300 bg-white"
    :style="{ width: `${width}px`, height: `${height}px` }"
    aria-hidden="true"
  >
    <div
      class="thumb-inner pointer-events-none absolute left-0 top-0 origin-top-left"
      :style="{ width: `${INNER}px`, transform: `scale(${scale})` }"
    >
      <PageRenderer :page="page" :data="data" :only="index" />
    </div>
  </div>
</template>

<style scoped>
/* Las portadas y el contacto miden "85vh"/"70vh" del navegador; en la miniatura se fija una altura de celular */
.thumb-inner :deep(section[class*='min-h-']) {
  min-height: 520px !important;
}
</style>