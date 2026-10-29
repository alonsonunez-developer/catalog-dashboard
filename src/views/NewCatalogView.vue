<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { buildPageFromTemplate, catalogTemplates, sampleCatalog, type CatalogDataInput } from 'catalog-kit'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import {
  errorMessage,
  fetchCategories,
  fetchProducts,
  slugify,
  SLUG_RE,
  starterPage,
  toRendererData,
  type Category,
  type Product,
} from '../lib/data'
import { toastRef } from '../lib/toast'
import TemplatePreview from '../components/TemplatePreview.vue'

const router = useRouter()
const allProducts = ref<Product[]>([])
const allCategories = ref<Category[]>([])
const loading = ref(true)
const error = toastRef('error')

const name = ref('')
const slug = ref('')
const slugTouched = ref(false)
const templateId = ref<string>(catalogTemplates[0].id)
const creating = ref(false)

// Colores de marca: la casilla solo existe si el negocio ya los definió, y viene marcada
const hasBrand = computed(() => !!organization.value?.brand_theme)
const useBrand = ref(!!organization.value?.brand_theme)
const themeOverride = computed(() => (hasBrand.value && useBrand.value ? 'brand' : undefined))

const templateOptions = [
  ...catalogTemplates.map((t) => ({ id: t.id, name: t.name, description: t.description })),
  { id: 'blank', name: 'Página larga', description: 'Una sola página con secciones apiladas. Se edita a mano.' },
]

watch(name, (n) => {
  if (!slugTouched.value) slug.value = slugify(n)
})
const slugValid = computed(() => SLUG_RE.test(slug.value))

const activeProducts = computed(() => allProducts.value.filter((p) => p.is_active).length)
const usingSample = computed(() => activeProducts.value === 0)
const selectedTemplate = computed(() => catalogTemplates.find((t) => t.id === templateId.value) ?? null)
const previewTitle = computed(() => name.value.trim() || 'Nombre del catálogo')

// Vista previa con los datos reales del negocio; si aún no hay productos, con datos de ejemplo
const previewData = computed<CatalogDataInput>(() =>
  usingSample.value
    ? { ...sampleCatalog, brandTheme: organization.value?.brand_theme ?? undefined }
    : toRendererData(organization.value!, allCategories.value, allProducts.value),
)

onMounted(async () => {
  const org = organization.value!
  const [products, categories] = await Promise.all([
    fetchProducts(org.id).catch(() => [] as Product[]),
    fetchCategories(org.id).catch(() => [] as Category[]),
  ])
  allProducts.value = products
  allCategories.value = categories
  loading.value = false
})

async function create() {
  creating.value = true
  error.value = ''
  try {
    const org = organization.value!
    const title = name.value.trim()
    let draft: Record<string, unknown>
    if (templateId.value === 'blank') {
      draft = starterPage(title)
    } else {
      const template = catalogTemplates.find((t) => t.id === templateId.value)!
      draft = buildPageFromTemplate(template, {
        title,
        subtitle: org.business.tagline,
        categories: allCategories.value.map((c) => ({ id: c.id, name: c.name })),
        products: allProducts.value
          .filter((p) => p.is_active)
          .map((p) => ({ id: p.id, categoryId: p.category_id ?? undefined })),
      })
    }
    // "brand" enlaza el catálogo a los colores del negocio (no guarda una copia)
    if (themeOverride.value) draft = { ...draft, theme: themeOverride.value }
    // Si el negocio ya tiene logo, el catálogo nuevo lo muestra (se puede apagar en el editor)
    if (templateId.value !== 'blank' && org.business.logo) draft = { ...draft, showLogo: true }

    const { data, error: e } = await supabase
      .from('catalogs')
      .insert({ organization_id: org.id, name: title, slug: slug.value, draft_page: draft })
      .select('id')
      .single()
    if (e) {
      error.value = e.code === '23505' ? 'Ese slug ya está en uso, elige otro.' : errorMessage(e)
      return
    }
    await router.push({ name: 'catalog-editor', params: { id: data.id } })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink :to="{ name: 'catalogs' }" class="text-sm text-neutral-500 underline">← Catálogos</RouterLink>
      <h1 class="text-2xl font-semibold">Nuevo catálogo</h1>
    </div>

    <p v-if="!canEdit" class="text-sm text-neutral-500">No tienes permiso para crear catálogos.</p>

    <form v-else class="card space-y-4" @submit.prevent="create">
      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="label" for="c-name">Nombre del catálogo</label>
          <input id="c-name" v-model="name" class="input" required maxlength="120" />
        </div>
        <div>
          <label class="label" for="c-slug">Dirección (slug)</label>
          <input id="c-slug" v-model="slug" class="input" required maxlength="60" @input="slugTouched = true" />
          <p v-if="slug && !slugValid" class="mt-1 text-xs text-red-600">Solo minúsculas, números y guiones.</p>
        </div>
      </div>

      <label v-if="hasBrand" class="flex items-start gap-2 text-sm">
        <input v-model="useBrand" type="checkbox" class="mt-1" />
        <span>
          <span class="font-medium">Usar los colores de mi negocio</span>
          <span class="block text-xs text-neutral-500">
            El catálogo seguirá tus colores de marca: si los cambias en Negocio, se actualiza. Desmárcala para usar
            los colores propios de la plantilla.
          </span>
        </span>
      </label>
      <p v-else class="text-xs text-neutral-500">
        Tip: define los colores de tu marca en
        <RouterLink :to="{ name: 'settings' }" class="underline">Negocio</RouterLink>
        y podrás usarlos en todos tus catálogos desde aquí.
      </p>

      <fieldset>
        <legend class="label">Plantilla</legend>
        <div class="grid gap-2 md:grid-cols-2">
          <label
            v-for="t in templateOptions"
            :key="t.id"
            class="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
            :class="templateId === t.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'"
          >
            <input v-model="templateId" type="radio" name="template" :value="t.id" class="mt-1" />
            <span class="min-w-0 flex-1">
              <span class="block font-medium">{{ t.name }}</span>
              <span class="text-neutral-600">{{ t.description }}</span>
            </span>
            <TemplatePreview
              v-if="t.id !== 'blank' && !loading"
              :template="catalogTemplates.find((x) => x.id === t.id)!"
              :title="previewTitle"
              :subtitle="organization?.business.tagline"
              :data="previewData"
              :theme="themeOverride"
              cover-only
              :width="72"
            />
          </label>
        </div>

        <div v-if="selectedTemplate && !loading" class="mt-4 space-y-2">
          <p class="text-sm font-medium">Vista previa: {{ selectedTemplate.name }}</p>
          <TemplatePreview
            :template="selectedTemplate"
            :title="previewTitle"
            :subtitle="organization?.business.tagline"
            :data="previewData"
            :theme="themeOverride"
          />
          <p class="text-xs text-neutral-500">
            <template v-if="usingSample">
              Con datos de ejemplo. Cuando agregues productos, aquí verás los tuyos, agrupados por categoría.
            </template>
            <template v-else>Con tus {{ activeProducts }} productos visibles, agrupados por categoría. Después podrás ajustarlo.</template>
          </p>
        </div>
        <p v-else-if="templateId === 'blank'" class="mt-2 text-xs text-neutral-500">
          Una sola página larga con portada, categorías, todos tus productos y pie de página.
        </p>
      </fieldset>

      <div class="flex gap-2">
        <button class="btn btn-primary" :disabled="creating || !name.trim() || !slugValid">
          {{ creating ? 'Creando…' : 'Crear catálogo' }}
        </button>
        <RouterLink :to="{ name: 'catalogs' }" class="btn btn-secondary">Cancelar</RouterLink>
      </div>
    </form>
  </div>
</template>