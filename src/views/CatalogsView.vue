<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage } from '../lib/data'
import { confirmDialog } from '../lib/confirm'
import { toast, toastRef } from '../lib/toast'
import { deleteCatalog, duplicateCatalog, unpublishCatalog } from '../lib/catalogs'
import CatalogMetaDialog from '../components/CatalogMetaDialog.vue'
import ActionMenu from '../components/ActionMenu.vue'
import { matchesQuery } from '../lib/search'
import SearchInput from '../components/SearchInput.vue'
import type { MenuItem } from '../lib/menu'

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
const error = toastRef('error')
const editing = ref<CatalogRow | null>(null)
const query = ref('')
const filtered = computed(() =>
  catalogs.value.filter((c) =>
    matchesQuery(query.value, [c.name, c.slug, c.status === 'published' ? 'publicado' : 'borrador']),
  ),
)

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

async function onDuplicate(c: CatalogRow) {
  try {
    await duplicateCatalog(c.id, orgId())
    toast.success('Copia creada como borrador.')
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function onUnpublish(c: CatalogRow) {
  const ok = await confirmDialog({
    title: 'Despublicar catálogo',
    message: `«${c.name}» dejará de ser visible en su enlace público y volverá a borrador. Podrás publicarlo de nuevo.`,
    confirmText: 'Despublicar',
    danger: true,
  })
  if (!ok) return
  try {
    await unpublishCatalog(c.id)
    toast.success('Catálogo despublicado.')
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function onDelete(c: CatalogRow) {
  const ok = await confirmDialog({
    title: 'Eliminar catálogo',
    message: `¿Eliminar «${c.name}»? ${c.status === 'published' ? 'Su enlace público dejará de funcionar. ' : ''}Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteCatalog(c.id)
    toast.success('Catálogo eliminado.')
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}

function rowActions(c: CatalogRow): MenuItem[] {
  const published = c.status === 'published'
  return [
    { label: 'Editar', action: () => router.push({ name: 'catalog-editor', params: { id: c.id } }) },
    { label: 'Ver catálogo', action: () => window.open(`${viewerUrl}/${c.slug}`, '_blank', 'noopener'), hidden: !published },
    { separator: true, hidden: !canEdit.value },
    { label: 'Duplicar', action: () => onDuplicate(c), hidden: !canEdit.value },
    { label: 'Nombre y dirección…', action: () => (editing.value = c), hidden: !canEdit.value },
    { label: 'Despublicar…', action: () => onUnpublish(c), hidden: !canEdit.value || !published },
    { separator: true, hidden: !canEdit.value },
    { label: 'Eliminar…', action: () => onDelete(c), hidden: !canEdit.value, danger: true },
  ]
}

async function onMetaSaved() {
  editing.value = null
  toast.success('Cambios guardados.')
  await load()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">Catálogos</h1>
      <RouterLink v-if="canEdit" :to="{ name: 'catalog-new' }" class="btn btn-primary">Nuevo catálogo</RouterLink>
    </div>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!catalogs.length" class="text-sm text-neutral-500">
      Aún no hay catálogos.
      <RouterLink v-if="canEdit" :to="{ name: 'catalog-new' }" class="underline">Crea el primero</RouterLink>
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-full max-w-sm">
          <SearchInput v-model="query" placeholder="Buscar por nombre, dirección o estado" />
        </div>
        <p v-if="query" class="text-sm text-neutral-500" aria-live="polite">{{ filtered.length }} de {{ catalogs.length }}</p>
      </div>

      <p v-if="!filtered.length" class="text-sm text-neutral-500">
        Ningún catálogo coincide con «{{ query }}».
        <button type="button" class="underline" @click="query = ''">Limpiar búsqueda</button>
      </p>
      <div v-else class="card overflow-x-auto !p-0">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-neutral-50 text-neutral-600">
            <tr>
              <th class="px-3 py-2">Nombre</th>
              <th class="px-3 py-2">Dirección</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filtered" :key="c.id" class="border-b last:border-0">
              <td class="max-w-[16rem] truncate px-3 py-2 font-medium">{{ c.name }}</td>
              <td class="px-3 py-2 text-neutral-600">/{{ c.slug }}</td>
              <td class="px-3 py-2">
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="c.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'"
                >
                  {{ c.status === 'published' ? 'Publicado' : 'Borrador' }}
                </span>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center justify-end">
                  <ActionMenu :items="rowActions(c)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <CatalogMetaDialog
      v-if="editing"
      :id="editing.id"
      :name="editing.name"
      :slug="editing.slug"
      :published="editing.status === 'published'"
      @close="editing = null"
      @saved="onMetaSaved"
    />
  </div>
</template>