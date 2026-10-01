<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  PageRenderer,
  PageSchema,
  addMissingProducts,
  addPage,
  builtinComponents,
  changeLayout,
  describeProps,
  missingProducts,
  movePage,
  pageEntries,
  pageLayouts,
  removePage,
  setPageProducts,
  themes,
  type Page,
} from 'catalog-kit'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, fetchCategories, fetchProducts, toRendererData, type Product } from '../lib/data'

type PageV2 = Extract<Page, { version: 2 }>

const LAYOUT_LABELS: Record<string, string> = {
  Cover: 'Portada',
  ProductFeature: '1 producto',
  ProductDuo: '2 productos',
  ProductGrid8: 'Hasta 8 productos',
  ContactPage: 'Contacto',
}
const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  subtitle: 'Subtítulo',
  message: 'Mensaje',
  image: 'Imagen de fondo (URL)',
  showBusinessName: 'Mostrar nombre del negocio',
  showSku: 'Mostrar código',
  showDescription: 'Mostrar descripción',
  attributeKeys: 'Atributos a mostrar (claves separadas por coma; vacío = todos)',
}
const layoutLabel = (l: string) => LAYOUT_LABELS[l] ?? l
const fieldLabel = (k: string) => FIELD_LABELS[k] ?? k

const route = useRoute()
const id = route.params.id as string
const viewerUrl = import.meta.env.VITE_VIEWER_URL as string

const loading = ref(true)
const name = ref('')
const slug = ref('')
const status = ref<'draft' | 'published'>('draft')
const text = ref('')
const lastSavedText = ref('')
const savedDraft = ref<unknown>(null)
const published = ref<unknown>(null)
const rendererData = ref<ReturnType<typeof toRendererData> | null>(null)
const allProducts = ref<Product[]>([])

const saving = ref(false)
const publishing = ref(false)
const error = ref('')
const notice = ref('')

const mode = ref<'visual' | 'json'>('visual')
const selected = ref(0)
const newLayout = ref('ProductGrid8')
const productToAdd = ref('')

async function loadCatalog() {
  const { data, error: e } = await supabase
    .from('catalogs')
    .select('name, slug, status, draft_page, published_page')
    .eq('id', id)
    .single()
  if (e) throw e
  name.value = data.name
  slug.value = data.slug
  status.value = data.status
  savedDraft.value = data.draft_page
  published.value = data.published_page
  return data
}

onMounted(async () => {
  try {
    const org = organization.value!
    const [catalog, categories, products] = await Promise.all([
      loadCatalog(),
      fetchCategories(org.id),
      fetchProducts(org.id),
    ])
    text.value = JSON.stringify(catalog.draft_page, null, 2)
    lastSavedText.value = text.value
    allProducts.value = products
    rendererData.value = toRendererData(org, categories, products)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

// ===== Estado derivado del JSON (única fuente de verdad) =====
const page = computed<Record<string, unknown> | null>(() => {
  try {
    const v = JSON.parse(text.value)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
})

const structureError = computed(() => {
  if (!page.value) return 'El JSON no es válido.'
  const r = PageSchema.safeParse(page.value)
  return r.success ? null : 'Estructura inválida: ' + r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
})

const sectionProblems = computed(() => {
  if (structureError.value) return []
  const r = PageSchema.safeParse(page.value)
  if (!r.success) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const s of pageEntries(r.data)) {
    if (seen.has(s.id)) out.push(`El id "${s.id}" está repetido.`)
    seen.add(s.id)
    const def = builtinComponents.find((c) => c.name === s.type)
    if (!def) {
      out.push(`Página "${s.id}": componente desconocido "${s.type}".`)
      continue
    }
    const p = def.propsSchema.safeParse(s.props)
    if (!p.success) {
      out.push(`Página "${s.id}" (${s.type}): ` + p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
    }
  }
  return out
})

const v2 = computed<PageV2 | null>(() => {
  const r = PageSchema.safeParse(page.value)
  return r.success && r.data.version === 2 ? r.data : null
})
const canVisual = computed(() => !structureError.value && !!v2.value)
const visual = computed(() => mode.value === 'visual' && canVisual.value)

const hasUnsaved = computed(() => text.value !== lastSavedText.value)
const hasUnpublished = computed(
  () => status.value === 'draft' || JSON.stringify(savedDraft.value) !== JSON.stringify(published.value),
)

function update(next: PageV2) {
  text.value = JSON.stringify(next, null, 2)
}

// ===== Tema =====
const currentTheme = computed(() => (typeof page.value?.theme === 'string' ? page.value.theme : ''))
function setTheme(theme: string) {
  if (!page.value) return
  text.value = JSON.stringify({ ...page.value, theme }, null, 2)
}

// ===== Páginas =====
const layouts = pageLayouts()
const entry = computed(() => v2.value?.pages[selected.value] ?? null)
const info = computed(() => (entry.value ? layouts.find((l) => l.name === entry.value!.layout) : undefined))
const maxProducts = computed(() => info.value?.maxProducts ?? 0)
const fields = computed(() => (entry.value ? describeProps(entry.value.layout).filter((f) => f.kind !== 'unsupported') : []))

const productById = computed(() => new Map(allProducts.value.map((p) => [p.id, p])))
const productName = (pid: string) => productById.value.get(pid)?.name ?? '(producto eliminado)'
const activeIds = computed(() => allProducts.value.filter((p) => p.is_active).map((p) => p.id))

function summary(e: PageV2['pages'][number]) {
  const ids = e.slots.products ?? []
  if (ids.length) return ids.map(productName).join(', ')
  return typeof e.props.title === 'string' ? e.props.title : ''
}

function select(i: number) {
  selected.value = i
  productToAdd.value = ''
}

function onAddPage() {
  if (!v2.value) return
  const at = selected.value + 1
  update(addPage(v2.value, newLayout.value, at))
  select(at)
}

function onRemovePage() {
  if (!v2.value || !entry.value) return
  if (!confirm(`¿Eliminar la página ${selected.value + 1} (${layoutLabel(entry.value.layout)})?`)) return
  const next = removePage(v2.value, selected.value)
  update(next)
  select(Math.max(0, Math.min(selected.value, next.pages.length - 1)))
}

function onMovePage(delta: number) {
  if (!v2.value) return
  const to = selected.value + delta
  update(movePage(v2.value, selected.value, to))
  if (to >= 0 && to < v2.value.pages.length) select(to)
}

function onChangeLayout(layout: string) {
  if (!v2.value) return
  update(changeLayout(v2.value, selected.value, layout))
}

function setProp(key: string, value: unknown) {
  if (!v2.value || !entry.value) return
  const props = { ...entry.value.props }
  if (value === '' || value === undefined) delete props[key]
  else props[key] = value
  update({ ...v2.value, pages: v2.value.pages.map((p, i) => (i === selected.value ? { ...p, props } : p)) })
}

const propValue = (key: string, fallback?: unknown) => entry.value?.props[key] ?? fallback

// ===== Productos de la página =====
const pageProducts = computed(() => entry.value?.slots.products ?? [])
const usedElsewhere = computed(() => {
  const set = new Set<string>()
  v2.value?.pages.forEach((p, i) => {
    if (i !== selected.value) (p.slots.products ?? []).forEach((x) => set.add(x))
  })
  return set
})
const available = computed(() =>
  allProducts.value.filter((p) => p.is_active && !pageProducts.value.includes(p.id)),
)
const pageIsFull = computed(() => pageProducts.value.length >= maxProducts.value)

function setProducts(ids: string[]) {
  if (v2.value) update(setPageProducts(v2.value, selected.value, ids))
}
function onAddProduct() {
  if (!productToAdd.value) return
  setProducts([...pageProducts.value, productToAdd.value])
  productToAdd.value = ''
}
function onRemoveProduct(i: number) {
  setProducts(pageProducts.value.filter((_, k) => k !== i))
}
function onMoveProduct(i: number, delta: number) {
  const ids = [...pageProducts.value]
  const j = i + delta
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  setProducts(ids)
}

// ===== Productos que ninguna página usa =====
const missing = computed(() => (v2.value ? missingProducts(v2.value, activeIds.value) : []))
function onAddMissing() {
  if (!v2.value) return
  const before = v2.value.pages.length
  update(addMissingProducts(v2.value, activeIds.value))
  notice.value = `Se agregaron ${missing.value.length} productos en páginas nuevas (antes del contacto).`
  if (before > 0) select(Math.min(before - 1, selected.value))
}

// ===== Guardar y publicar =====
async function saveDraft(): Promise<boolean> {
  error.value = ''
  notice.value = ''
  if (structureError.value) {
    error.value = structureError.value
    return false
  }
  saving.value = true
  const { data, error: e } = await supabase
    .from('catalogs')
    .update({ draft_page: page.value })
    .eq('id', id)
    .select('draft_page')
    .single()
  saving.value = false
  if (e) {
    error.value = errorMessage(e)
    return false
  }
  savedDraft.value = data.draft_page
  lastSavedText.value = text.value
  notice.value = 'Borrador guardado.'
  return true
}

async function publish() {
  if (sectionProblems.value.length) {
    error.value = 'Corrige los problemas antes de publicar.'
    return
  }
  if (!(await saveDraft())) return
  publishing.value = true
  const { error: e } = await supabase.rpc('publish_catalog', { p_catalog_id: id })
  publishing.value = false
  if (e) {
    error.value = errorMessage(e)
    return
  }
  try {
    await loadCatalog()
    notice.value = 'Catálogo publicado.'
  } catch (err) {
    error.value = errorMessage(err)
  }
}
</script>

<template>
  <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
  <p v-else-if="!rendererData" class="text-sm text-red-600">{{ error || 'No se pudo cargar el catálogo.' }}</p>
  <div v-else class="space-y-4">
    <!-- Encabezado -->
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink :to="{ name: 'catalogs' }" class="text-sm text-neutral-500 underline">← Catálogos</RouterLink>
      <h1 class="text-xl font-semibold">{{ name }}</h1>
      <span class="text-xs" :class="status === 'published' ? 'text-green-700' : 'text-amber-700'">
        {{ status === 'published' ? 'Publicado' : 'Borrador' }}
      </span>
      <span v-if="hasUnsaved" class="text-xs text-red-600">Cambios sin guardar</span>
      <span v-else-if="hasUnpublished" class="text-xs text-amber-700">Hay cambios sin publicar</span>
      <a
        v-if="status === 'published'"
        :href="`${viewerUrl}/${slug}`"
        target="_blank"
        rel="noopener noreferrer"
        class="ml-auto text-sm underline"
      >
        Abrir catálogo público
      </a>
    </div>

    <!-- Barra de herramientas -->
    <div class="flex flex-wrap items-center gap-3">
      <label class="label !mb-0" for="theme">Tema</label>
      <select
        id="theme"
        class="input !w-auto"
        :value="currentTheme"
        :disabled="!canEdit || !page"
        @change="setTheme(($event.target as HTMLSelectElement).value)"
      >
        <option v-if="!(currentTheme in themes)" :value="currentTheme">{{ currentTheme || '(personalizado)' }}</option>
        <option v-for="t in Object.keys(themes)" :key="t" :value="t">{{ t }}</option>
      </select>

      <div class="flex overflow-hidden rounded-md border border-neutral-300 text-sm">
        <button
          type="button"
          class="px-3 py-2"
          :class="visual ? 'bg-neutral-900 text-white' : 'bg-white'"
          :disabled="!canVisual"
          :title="canVisual ? '' : 'Solo disponible para catálogos por páginas con JSON válido'"
          @click="mode = 'visual'"
        >
          Editor visual
        </button>
        <button type="button" class="px-3 py-2" :class="!visual ? 'bg-neutral-900 text-white' : 'bg-white'" @click="mode = 'json'">
          JSON avanzado
        </button>
      </div>

      <div v-if="canEdit" class="ml-auto flex gap-2">
        <button class="btn btn-secondary" :disabled="saving || publishing || !hasUnsaved" @click="saveDraft">
          {{ saving ? 'Guardando…' : 'Guardar borrador' }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="saving || publishing || sectionProblems.length > 0 || !!structureError"
          @click="publish"
        >
          {{ publishing ? 'Publicando…' : 'Guardar y publicar' }}
        </button>
      </div>
    </div>

    <ul
      v-if="structureError || sectionProblems.length"
      class="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
    >
      <li v-if="structureError">{{ structureError }}</li>
      <li v-for="p in sectionProblems" :key="p">{{ p }}</li>
    </ul>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="notice" class="text-sm text-green-700">{{ notice }}</p>

    <!-- ===== Editor visual ===== -->
    <div v-if="visual && v2" class="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_21rem]">
      <!-- Lista de páginas -->
      <aside class="space-y-2">
        <ol class="space-y-1">
          <li v-for="(p, i) in v2.pages" :key="p.id">
            <button
              type="button"
              class="w-full rounded-md border p-2 text-left text-sm"
              :class="i === selected ? 'border-neutral-900 bg-white' : 'border-neutral-200 bg-white/60 hover:bg-white'"
              @click="select(i)"
            >
              <span class="font-medium">{{ i + 1 }}. {{ layoutLabel(p.layout) }}</span>
              <span class="block truncate text-xs text-neutral-500">{{ summary(p) || '—' }}</span>
            </button>
          </li>
        </ol>

        <div v-if="canEdit" class="card space-y-2 !p-3">
          <label class="label" for="new-layout">Nueva página después de la {{ selected + 1 }}</label>
          <select id="new-layout" v-model="newLayout" class="input">
            <option v-for="l in layouts" :key="l.name" :value="l.name">{{ layoutLabel(l.name) }}</option>
          </select>
          <button type="button" class="btn btn-secondary w-full" @click="onAddPage">Agregar página</button>
        </div>

        <div v-if="canEdit && missing.length" class="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          {{ missing.length }} producto(s) visible(s) no están en ninguna página.
          <button type="button" class="btn btn-secondary mt-2 w-full" @click="onAddMissing">Agregarlos en páginas nuevas</button>
        </div>
      </aside>

      <!-- Vista previa de la página seleccionada -->
      <section class="flex justify-center rounded-lg bg-neutral-200 p-4">
        <div class="w-full max-w-[420px] overflow-hidden rounded-lg bg-white shadow">
          <div class="max-h-[44rem] overflow-auto">
            <PageRenderer :page="page" :data="rendererData" :only="selected" />
          </div>
        </div>
      </section>

      <!-- Propiedades -->
      <aside v-if="entry" class="card space-y-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-medium">Página {{ selected + 1 }} de {{ v2.pages.length }}</h2>
          <div v-if="canEdit" class="flex gap-1">
            <button type="button" class="btn btn-secondary !px-2" :disabled="selected === 0" title="Subir" @click="onMovePage(-1)">↑</button>
            <button type="button" class="btn btn-secondary !px-2" :disabled="selected === v2.pages.length - 1" title="Bajar" @click="onMovePage(1)">↓</button>
            <button type="button" class="btn btn-danger !px-2" title="Eliminar página" @click="onRemovePage">✕</button>
          </div>
        </div>

        <div>
          <label class="label" for="layout">Diseño de la página</label>
          <select
            id="layout"
            class="input"
            :value="entry.layout"
            :disabled="!canEdit"
            @change="onChangeLayout(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="l in layouts" :key="l.name" :value="l.name">{{ layoutLabel(l.name) }}</option>
          </select>
          <p class="mt-1 text-xs text-neutral-500">{{ info?.description }}</p>
        </div>

        <!-- Textos y opciones, generados del schema del layout -->
        <div v-for="f in fields" :key="f.key">
          <label v-if="f.kind === 'boolean'" class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              :checked="propValue(f.key, f.default) === true"
              :disabled="!canEdit"
              @change="setProp(f.key, ($event.target as HTMLInputElement).checked)"
            />
            {{ fieldLabel(f.key) }}
          </label>
          <template v-else>
            <label class="label" :for="`f-${f.key}`">{{ fieldLabel(f.key) }}</label>
            <select
              v-if="f.kind === 'select'"
              :id="`f-${f.key}`"
              class="input"
              :value="propValue(f.key, f.default)"
              :disabled="!canEdit"
              @change="setProp(f.key, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
            </select>
            <input
              v-else-if="f.kind === 'textlist'"
              :id="`f-${f.key}`"
              class="input"
              :value="((propValue(f.key, []) as string[]) ?? []).join(', ')"
              :disabled="!canEdit"
              @input="
                setProp(
                  f.key,
                  ($event.target as HTMLInputElement).value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              "
            />
            <input
              v-else-if="f.kind === 'number'"
              :id="`f-${f.key}`"
              type="number"
              class="input"
              :value="propValue(f.key, f.default)"
              :disabled="!canEdit"
              @input="setProp(f.key, ($event.target as HTMLInputElement).valueAsNumber)"
            />
            <input
              v-else
              :id="`f-${f.key}`"
              class="input"
              :value="propValue(f.key, '')"
              :disabled="!canEdit"
              @input="setProp(f.key, ($event.target as HTMLInputElement).value)"
            />
          </template>
        </div>

        <!-- Productos -->
        <div v-if="maxProducts > 0" class="space-y-2">
          <p class="label !mb-0">Productos ({{ pageProducts.length }}/{{ maxProducts }})</p>
          <ul v-if="pageProducts.length" class="space-y-1">
            <li
              v-for="(pid, i) in pageProducts"
              :key="pid"
              class="flex items-center gap-1 rounded border border-neutral-200 p-1 text-sm"
            >
              <span class="min-w-0 flex-1 truncate px-1" :class="productById.get(pid)?.is_active ? '' : 'text-neutral-400'">
                {{ productName(pid) }}<span v-if="productById.get(pid) && !productById.get(pid)!.is_active"> (oculto)</span>
              </span>
              <template v-if="canEdit">
                <button type="button" class="btn btn-secondary !px-2 !py-0.5" :disabled="i === 0" @click="onMoveProduct(i, -1)">↑</button>
                <button type="button" class="btn btn-secondary !px-2 !py-0.5" :disabled="i === pageProducts.length - 1" @click="onMoveProduct(i, 1)">↓</button>
                <button type="button" class="btn btn-danger !px-2 !py-0.5" @click="onRemoveProduct(i)">✕</button>
              </template>
            </li>
          </ul>
          <p v-else class="text-xs text-neutral-500">Esta página aún no tiene productos.</p>

          <div v-if="canEdit" class="flex gap-2">
            <select v-model="productToAdd" class="input" :disabled="pageIsFull || !available.length">
              <option value="">{{ pageIsFull ? 'Página llena' : 'Agregar producto…' }}</option>
              <option v-for="p in available" :key="p.id" :value="p.id">
                {{ p.name }}{{ usedElsewhere.has(p.id) ? ' (ya está en otra página)' : '' }}
              </option>
            </select>
            <button type="button" class="btn btn-secondary" :disabled="!productToAdd" @click="onAddProduct">Agregar</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- ===== JSON avanzado ===== -->
    <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section class="space-y-3">
        <p v-if="!canVisual && !structureError" class="text-xs text-neutral-500">
          Este catálogo es de página larga (versión 1): solo se edita como JSON.
        </p>
        <textarea v-model="text" spellcheck="false" :readonly="!canEdit" class="input h-[32rem] font-mono text-xs" />
      </section>
      <section class="overflow-hidden rounded-lg border border-neutral-300 bg-white">
        <div class="max-h-[40rem] overflow-auto">
          <PageRenderer v-if="page" :page="page" :data="rendererData" />
          <p v-else class="p-4 text-sm text-neutral-500">Corrige el JSON para ver la vista previa.</p>
        </div>
      </section>
    </div>
  </div>
</template>