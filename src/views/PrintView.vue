<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { PageSchema, pageEntries, type CatalogDataInput } from 'catalog-kit'
import { supabase } from '../lib/supabase'
import { organization } from '../lib/session'
import { errorMessage, fetchCategories, fetchProducts, toRendererData } from '../lib/data'
import PrintSheet from '../components/PrintSheet.vue'

const print = () => window.print()

const PAPERS = {
  A3: { label: 'A3 (297 × 420 mm)', w: 297, h: 420 },
  A4: { label: 'A4 (210 × 297 mm)', w: 210, h: 297 },
  Carta: { label: 'Carta (216 × 279 mm)', w: 215.9, h: 279.4 },
} as const
type PaperKey = keyof typeof PAPERS

const route = useRoute()
const id = route.params.id as string

const paper = ref<PaperKey>('A3')
const size = computed(() => PAPERS[paper.value])

const loading = ref(true)
const ready = ref(false) // imágenes y fuentes cargadas
const error = ref('')
const name = ref('')
const page = ref<unknown>(null)
const data = ref<CatalogDataInput | null>(null)
const count = ref(0)
const paged = ref(true)

// El tamaño de hoja y los colores de impresión se declaran con una hoja de estilos temporal:
// un @page dentro de un componente seguiría activo al salir de esta pantalla.
let styleEl: HTMLStyleElement | null = null
function applyPrintStyle() {
  if (!styleEl) {
    styleEl = document.createElement('style')
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = `
    @page { size: ${size.value.w}mm ${size.value.h}mm; margin: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print {
      html, body { margin: 0 !important; background: #fff !important; }
      .no-print { display: none !important; }
    }`
}
watch(paper, applyPrintStyle)

async function waitForImages() {
  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.print-root img'))
  // Las imágenes "lazy" que quedan fuera de pantalla no se cargan solas al imprimir
  imgs.forEach((i) => (i.loading = 'eager'))
  const loaded = Promise.all(
    imgs.map((i) =>
      i.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            i.addEventListener('load', () => resolve(), { once: true })
            i.addEventListener('error', () => resolve(), { once: true })
          }),
    ),
  )
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 20000))])
  await document.fonts?.ready
  ready.value = true
}

onMounted(async () => {
  applyPrintStyle()
  try {
    const org = organization.value!
    const [{ data: row, error: e }, categories, products] = await Promise.all([
      supabase.from('catalogs').select('name, draft_page').eq('id', id).single(),
      fetchCategories(org.id),
      fetchProducts(org.id),
    ])
    if (e) throw e
    name.value = row.name
    document.title = row.name // Chrome propone este nombre al guardar el PDF
    const parsed = PageSchema.safeParse(row.draft_page)
    if (!parsed.success) throw new Error('El catálogo tiene una estructura inválida. Corrígela en el editor.')
    paged.value = parsed.data.version === 2
    count.value = paged.value ? pageEntries(parsed.data).length : 0
    page.value = row.draft_page
    data.value = toRendererData(org, categories, products)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
  if (!error.value && paged.value) {
    await nextTick()
    await waitForImages()
  }
})

onBeforeUnmount(() => styleEl?.remove())
</script>

<template>
  <div class="print-root min-h-screen bg-neutral-300 pb-8">
    <div class="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3">
      <RouterLink :to="{ name: 'catalog-editor', params: { id } }" class="text-sm underline">← Volver al editor</RouterLink>
      <h1 class="font-semibold">{{ name }}</h1>

      <label class="label !mb-0 ml-auto" for="paper">Papel</label>
      <select id="paper" v-model="paper" class="input !w-auto">
        <option v-for="(p, k) in PAPERS" :key="k" :value="k">{{ p.label }}</option>
      </select>
      <button class="btn btn-primary" :disabled="!ready" @click="print">
        {{ ready ? 'Imprimir / Guardar PDF' : 'Preparando imágenes…' }}
      </button>
    </div>

    <p v-if="ready" class="no-print mx-auto max-w-3xl px-4 py-3 text-xs text-neutral-700">
      En el diálogo de impresión elige <b>Guardar como PDF</b> o tu impresora, deja los <b>márgenes en «Ninguno»</b> y
      activa <b>Gráficos de fondo</b>. Se imprime el borrador guardado ({{ count }} páginas).
    </p>

    <p v-if="loading" class="p-6 text-sm">Cargando…</p>
    <p v-else-if="error" class="p-6 text-sm text-red-700">{{ error }}</p>
    <p v-else-if="!paged" class="p-6 text-sm">
      Este catálogo es de página larga (versión 1) y no se puede imprimir por hojas. Crea uno con una plantilla para
      poder exportarlo.
    </p>
    <div v-else-if="data" class="overflow-x-auto pt-4">
      <PrintSheet
        v-for="i in count"
        :key="`${paper}-${i}`"
        :page="page"
        :data="data"
        :index="i - 1"
        :width-mm="size.w"
        :height-mm="size.h"
      />
    </div>
  </div>
</template>