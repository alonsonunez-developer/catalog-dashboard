<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, slugify, SLUG_RE, starterPage } from '../lib/data'

interface CatalogRow {
  id: string
  name: string
  slug: string
  status: 'draft' | 'published'
}

const router = useRouter()
const orgId = () => organization.value!.id
const viewerUrl = import.meta.env.VITE_VIEWER_URL as string

const catalogs = ref<CatalogRow[]>([])
const loading = ref(true)
const error = ref('')

const name = ref('')
const slug = ref('')
const slugTouched = ref(false)
const creating = ref(false)

watch(name, (n) => {
  if (!slugTouched.value) slug.value = slugify(n)
})
const slugValid = computed(() => SLUG_RE.test(slug.value))

async function load() {
  const { data, error: e } = await supabase
    .from('catalogs')
    .select('id, name, slug, status')
    .eq('organization_id', orgId())
    .order('created_at', { ascending: false })
  if (e) error.value = errorMessage(e)
  catalogs.value = (data ?? []) as CatalogRow[]
  loading.value = false
}
onMounted(load)

async function create() {
  creating.value = true
  error.value = ''
  const title = name.value.trim()
  const { data, error: e } = await supabase
    .from('catalogs')
    .insert({ organization_id: orgId(), name: title, slug: slug.value, draft_page: starterPage(title) })
    .select('id')
    .single()
  creating.value = false
  if (e) {
    error.value = e.code === '23505' ? 'Ese slug ya está en uso, elige otro.' : errorMessage(e)
    return
  }
  await router.push({ name: 'catalog-editor', params: { id: data.id } })
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-semibold">Catálogos</h1>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <form v-if="canEdit" class="card grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end" @submit.prevent="create">
      <div>
        <label class="label" for="c-name">Nombre del catálogo</label>
        <input id="c-name" v-model="name" class="input" required maxlength="120" />
      </div>
      <div>
        <label class="label" for="c-slug">Dirección (slug)</label>
        <input
          id="c-slug"
          v-model="slug"
          class="input"
          required
          maxlength="60"
          @input="slugTouched = true"
        />
        <p v-if="slug && !slugValid" class="mt-1 text-xs text-red-600">Solo minúsculas, números y guiones.</p>
      </div>
      <button class="btn btn-primary" :disabled="creating || !name.trim() || !slugValid">
        {{ creating ? 'Creando…' : 'Crear catálogo' }}
      </button>
    </form>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!catalogs.length" class="text-sm text-neutral-500">Aún no hay catálogos.</p>
    <ul v-else class="grid gap-3 md:grid-cols-2">
      <li v-for="c in catalogs" :key="c.id" class="card flex items-center justify-between gap-3">
        <div>
          <p class="font-medium">{{ c.name }}</p>
          <p class="text-xs text-neutral-500">
            /{{ c.slug }} ·
            <span :class="c.status === 'published' ? 'text-green-700' : 'text-amber-700'">
              {{ c.status === 'published' ? 'Publicado' : 'Borrador' }}
            </span>
          </p>
        </div>
        <div class="flex gap-2">
          <a
            v-if="c.status === 'published'"
            :href="`${viewerUrl}/${c.slug}`"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-secondary"
          >
            Ver
          </a>
          <RouterLink :to="{ name: 'catalog-editor', params: { id: c.id } }" class="btn btn-primary">Editar</RouterLink>
        </div>
      </li>
    </ul>
  </div>
</template>