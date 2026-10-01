<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PageRenderer, PageSchema, builtinComponents, pageEntries, themes } from 'catalog-kit'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, fetchCategories, fetchProducts, toRendererData } from '../lib/data'

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

const saving = ref(false)
const publishing = ref(false)
const error = ref('')
const notice = ref('')

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
    rendererData.value = toRendererData(org, categories, products)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
})

const page = computed<Record<string, unknown> | null>(() => {
  try {
    const v = JSON.parse(text.value)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
})

// Problemas de estructura (impiden guardar) y de secciones (impiden publicar)
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
      out.push(`Sección "${s.id}": componente desconocido "${s.type}".`)
      continue
    }
    const p = def.propsSchema.safeParse(s.props)
    if (!p.success) {
      out.push(`Sección "${s.id}" (${s.type}): ` + p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
    }
  }
  return out
})

const hasUnsaved = computed(() => text.value !== lastSavedText.value)
const hasUnpublished = computed(
  () => status.value === 'draft' || JSON.stringify(savedDraft.value) !== JSON.stringify(published.value),
)

const currentTheme = computed(() => (typeof page.value?.theme === 'string' ? page.value.theme : ''))
function setTheme(theme: string) {
  if (!page.value) return
  text.value = JSON.stringify({ ...page.value, theme }, null, 2)
}

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

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section class="space-y-3">
        <div class="flex items-center gap-2">
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
        </div>

        <textarea
          v-model="text"
          spellcheck="false"
          :readonly="!canEdit"
          class="input h-[32rem] font-mono text-xs"
        />

        <ul v-if="structureError || sectionProblems.length" class="space-y-1 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <li v-if="structureError">{{ structureError }}</li>
          <li v-for="p in sectionProblems" :key="p">{{ p }}</li>
        </ul>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <p v-if="notice" class="text-sm text-green-700">{{ notice }}</p>

        <div v-if="canEdit" class="flex gap-2">
          <button class="btn btn-secondary" :disabled="saving || publishing || !hasUnsaved" @click="saveDraft">
            {{ saving ? 'Guardando…' : 'Guardar borrador' }}
          </button>
          <button class="btn btn-primary" :disabled="saving || publishing || sectionProblems.length > 0 || !!structureError" @click="publish">
            {{ publishing ? 'Publicando…' : 'Guardar y publicar' }}
          </button>
        </div>
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