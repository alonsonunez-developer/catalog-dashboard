<script setup lang="ts">
import { computed } from 'vue'
import { buildPageFromTemplate, type CatalogDataInput, type CatalogTemplate } from 'catalog-kit'
import PageThumb from './PageThumb.vue'

const props = withDefaults(
  defineProps<{
    template: CatalogTemplate
    title: string
    subtitle?: string
    data: CatalogDataInput
    theme?: string // si se indica (por ejemplo "brand"), reemplaza el tema de la plantilla
    coverOnly?: boolean
    width?: number
  }>(),
  { coverOnly: false, width: 150, theme: undefined },
)

const page = computed(() => {
  try {
    const built = buildPageFromTemplate(props.template, {
      title: props.title,
      subtitle: props.subtitle,
      products: (props.data.products ?? []).map((p) => ({ id: p.id, categoryId: p.categoryId })),
      categories: props.data.categories ?? [],
    })
    return props.theme ? { ...built, theme: props.theme } : built
  } catch {
    return null
  }
})

// Portada, dos páginas de productos y la última (contacto)
const indices = computed(() => {
  const n = page.value?.pages.length ?? 0
  if (props.coverOnly) return n ? [0] : []
  return [...new Set([0, 1, 2, n - 1])].filter((i) => i >= 0 && i < n)
})
</script>

<template>
  <p v-if="!page" class="text-xs text-red-600">No se pudo generar la vista previa.</p>
  <div v-else-if="coverOnly">
    <PageThumb :page="page" :data="data" :index="0" :width="width" />
  </div>
  <div v-else class="space-y-2">
    <div class="flex gap-3 overflow-x-auto pb-1">
      <PageThumb v-for="i in indices" :key="i" :page="page" :data="data" :index="i" :width="width" />
    </div>
    <p class="text-xs text-neutral-500">Este catálogo tendría {{ page.pages.length }} páginas.</p>
  </div>
</template>