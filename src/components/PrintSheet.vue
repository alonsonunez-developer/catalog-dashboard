<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PageRenderer, resolveTheme, type CatalogDataInput, type Theme } from 'catalog-kit'

const props = defineProps<{
  page: unknown
  data: CatalogDataInput
  index: number
  widthMm: number
  heightMm: number
}>()

const INNER = 390 // ancho de celular en el que se diseñó cada página
const MM = 96 / 25.4 // milímetros a píxeles CSS
// 0.5 mm menos de alto: evita que el redondeo del navegador genere una hoja en blanco entre páginas
const sheetW = computed(() => props.widthMm * MM)
const sheetH = computed(() => (props.heightMm - 0.5) * MM)

const inner = ref<HTMLElement | null>(null)
const contentH = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!inner.value) return
  contentH.value = inner.value.offsetHeight
  // Se vuelve a medir cuando cargan fuentes o imágenes y cambia la altura
  observer = new ResizeObserver(() => {
    if (inner.value) contentH.value = inner.value.offsetHeight
  })
  observer.observe(inner.value)
})
onBeforeUnmount(() => observer?.disconnect())

// Alto mínimo (en px de la página de 390) para que portadas y contacto llenen la hoja
const fill = computed(() => Math.round((INNER * sheetH.value) / sheetW.value))

// Se escala a lo ancho de la hoja; si el contenido queda más alto que la hoja, se reduce hasta que quepa
const scale = computed(() => {
  const byWidth = sheetW.value / INNER
  if (!contentH.value) return byWidth
  return Math.min(byWidth, sheetH.value / contentH.value)
})
const offsetX = computed(() => (sheetW.value - INNER * scale.value) / 2)

const background = computed(() => {
  const t = ((props.page as { theme?: string | Theme } | null)?.theme ?? 'joyeria') as string | Theme
  try {
    return resolveTheme(t, (props.data.brandTheme as Theme | null | undefined) ?? null).colors.background
  } catch {
    return '#ffffff'
  }
})
</script>

<template>
  <div
    class="sheet"
    :style="{ width: `${widthMm}mm`, height: `${heightMm - 0.5}mm`, backgroundColor: background }"
  >
    <div
      ref="inner"
      class="print-inner"
      :style="{ width: `${INNER}px`, transform: `translateX(${offsetX}px) scale(${scale})`, '--fill': `${fill}px` }"
    >
      <PageRenderer :page="page" :data="data" :only="index" />
    </div>
  </div>
</template>

<style scoped>
.sheet {
  position: relative;
  overflow: hidden;
  margin: 0 auto 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  break-after: page;
  break-inside: avoid;
}
.print-inner {
  transform-origin: top left;
  pointer-events: none;
}
/* Portadas y contacto miden "85vh"/"70vh"; en papel se les da el alto de la hoja */
.print-inner :deep(section[class*='min-h-']) {
  min-height: var(--fill) !important;
}
@media print {
  .sheet {
    margin: 0;
    box-shadow: none;
  }
  .sheet:last-child {
    break-after: auto;
  }
}
</style>