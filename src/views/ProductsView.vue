<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, fetchCategories, fetchProducts, type Category, type Product } from '../lib/data'
import { deleteStoredImage } from '../lib/storage'
import { confirmDialog } from '../lib/confirm'
import { toast, toastRef } from '../lib/toast'
import { matchesQuery } from '../lib/search'
import SearchInput from '../components/SearchInput.vue'

const orgId = () => organization.value!.id
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = toastRef('error')

const categoryName = computed(() => new Map(categories.value.map((c) => [c.id, c.name])))
const fmt = computed(
  () => new Intl.NumberFormat('es-MX', { style: 'currency', currency: organization.value!.currency }),
)

const query = ref('')
const filtered = computed(() =>
  products.value.filter((p) =>
    matchesQuery(query.value, [
      p.name,
      p.sku,
      p.description,
      p.category_id ? categoryName.value.get(p.category_id) : 'sin categoría',
      p.is_active ? 'visible' : 'oculto',
    ]),
  ),
)

async function load() {
  try {
    ;[products.value, categories.value] = await Promise.all([fetchProducts(orgId()), fetchCategories(orgId())])
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const storedPhotos = (p: Product) => [p.image_url, ...p.gallery].filter((u): u is string => !!u)

async function remove(p: Product) {
  const ok = await confirmDialog({
    title: 'Eliminar producto',
    message: `¿Eliminar "${p.name}"? También se borrarán sus fotos. Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  const { error: e } = await supabase.from('products').delete().eq('id', p.id)
  if (e) {
    error.value = errorMessage(e)
    return
  }
  for (const u of storedPhotos(p)) await deleteStoredImage(u)
  toast.success('Producto eliminado.')
  await load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">Productos</h1>
      <RouterLink v-if="canEdit" :to="{ name: 'product-new' }" class="btn btn-primary">Nuevo producto</RouterLink>
    </div>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!products.length" class="text-sm text-neutral-500">
      Aún no hay productos.
      <RouterLink v-if="canEdit" :to="{ name: 'product-new' }" class="underline">Crea el primero</RouterLink>
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center gap-3">
        <div class="w-full max-w-sm">
          <SearchInput v-model="query" placeholder="Buscar por nombre, código, categoría…" />
        </div>
        <p v-if="query" class="text-sm text-neutral-500" aria-live="polite">{{ filtered.length }} de {{ products.length }}</p>
      </div>

      <p v-if="!filtered.length" class="text-sm text-neutral-500">
        Ningún producto coincide con «{{ query }}».
        <button type="button" class="underline" @click="query = ''">Limpiar búsqueda</button>
      </p>
      <div v-else class="card overflow-x-auto !p-0">
        <table class="w-full text-left text-sm">
          <thead class="border-b bg-neutral-50 text-neutral-600">
            <tr>
              <th class="px-3 py-2">Producto</th>
              <th class="px-3 py-2">Código</th>
              <th class="px-3 py-2">Categoría</th>
              <th class="px-3 py-2">Precio</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id" class="border-b last:border-0">
              <td class="px-3 py-2">
                <div class="flex items-center gap-3">
                  <div class="relative">
                    <img v-if="p.image_url" :src="p.image_url" alt="" class="h-10 w-10 rounded object-cover" />
                    <div v-else class="h-10 w-10 rounded bg-neutral-100" />
                    <span
                      v-if="p.gallery.length"
                      class="absolute -right-1 -top-1 rounded-full bg-neutral-900 px-1 text-[10px] text-white"
                    >
                      +{{ p.gallery.length }}
                    </span>
                  </div>
                  <span class="font-medium">{{ p.name }}</span>
                </div>
              </td>
              <td class="px-3 py-2">{{ p.sku ?? '—' }}</td>
              <td class="px-3 py-2">{{ p.category_id ? categoryName.get(p.category_id) : '—' }}</td>
              <td class="px-3 py-2">
                {{ fmt.format(p.price) }}
                <s v-if="p.compare_at_price" class="ml-1 text-xs text-neutral-400">{{ fmt.format(p.compare_at_price) }}</s>
              </td>
              <td class="px-3 py-2">{{ p.is_active ? 'Visible' : 'Oculto' }}</td>
              <td class="space-x-2 px-3 py-2 text-right">
                <template v-if="canEdit">
                  <RouterLink :to="{ name: 'product-edit', params: { id: p.id } }" class="btn btn-secondary">Editar</RouterLink>
                  <button class="btn btn-danger" @click="remove(p)">Eliminar</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>