<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, fetchCategories, fetchProducts, type Category, type Product } from '../lib/data'

const orgId = () => organization.value!.id
const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const saving = ref(false)

const emptyForm = () => ({
  id: null as string | null,
  name: '',
  price: 0,
  description: '',
  image_url: '',
  category_id: '',
  is_active: true,
})
const form = ref(emptyForm())

const categoryName = computed(() => new Map(categories.value.map((c) => [c.id, c.name])))
const fmt = computed(
  () => new Intl.NumberFormat('es-MX', { style: 'currency', currency: organization.value!.currency }),
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

function create() {
  form.value = emptyForm()
  showForm.value = true
}

function edit(p: Product) {
  form.value = {
    id: p.id,
    name: p.name,
    price: p.price,
    description: p.description ?? '',
    image_url: p.image_url ?? '',
    category_id: p.category_id ?? '',
    is_active: p.is_active,
  }
  showForm.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  const f = form.value
  const payload = {
    name: f.name.trim(),
    price: f.price,
    description: f.description.trim() || null,
    image_url: f.image_url.trim() || null,
    category_id: f.category_id || null,
    is_active: f.is_active,
  }
  const { error: e } = f.id
    ? await supabase.from('products').update(payload).eq('id', f.id)
    : await supabase.from('products').insert({ ...payload, organization_id: orgId() })
  saving.value = false
  if (e) {
    error.value = errorMessage(e)
    return
  }
  showForm.value = false
  await load()
}

async function remove(p: Product) {
  if (!confirm(`¿Eliminar "${p.name}"?`)) return
  error.value = ''
  const { error: e } = await supabase.from('products').delete().eq('id', p.id)
  if (e) error.value = errorMessage(e)
  await load()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Productos</h1>
      <button v-if="canEdit" class="btn btn-primary" @click="create">Nuevo producto</button>
    </div>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <form v-if="showForm" class="card grid gap-3 md:grid-cols-2" @submit.prevent="save">
      <div>
        <label class="label" for="p-name">Nombre</label>
        <input id="p-name" v-model="form.name" class="input" required maxlength="200" />
      </div>
      <div>
        <label class="label" for="p-price">Precio ({{ organization?.currency }})</label>
        <input id="p-price" v-model.number="form.price" type="number" step="0.01" min="0" class="input" required />
      </div>
      <div>
        <label class="label" for="p-cat">Categoría</label>
        <select id="p-cat" v-model="form.category_id" class="input">
          <option value="">Sin categoría</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="p-img">URL de la imagen</label>
        <input id="p-img" v-model="form.image_url" type="url" class="input" placeholder="https://…" />
      </div>
      <div class="md:col-span-2">
        <label class="label" for="p-desc">Descripción</label>
        <textarea id="p-desc" v-model="form.description" rows="2" class="input" />
      </div>
      <label class="flex items-center gap-2 text-sm md:col-span-2">
        <input v-model="form.is_active" type="checkbox" /> Visible en el catálogo
      </label>
      <div class="flex gap-2 md:col-span-2">
        <button class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        <button type="button" class="btn btn-secondary" @click="showForm = false">Cancelar</button>
      </div>
    </form>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!products.length" class="text-sm text-neutral-500">Aún no hay productos.</p>
    <div v-else class="card overflow-x-auto !p-0">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-neutral-50 text-neutral-600">
          <tr>
            <th class="px-3 py-2">Producto</th>
            <th class="px-3 py-2">Categoría</th>
            <th class="px-3 py-2">Precio</th>
            <th class="px-3 py-2">Estado</th>
            <th class="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in products" :key="p.id" class="border-b last:border-0">
            <td class="px-3 py-2">
              <div class="flex items-center gap-3">
                <img v-if="p.image_url" :src="p.image_url" alt="" class="h-10 w-10 rounded object-cover" />
                <span class="font-medium">{{ p.name }}</span>
              </div>
            </td>
            <td class="px-3 py-2">{{ p.category_id ? categoryName.get(p.category_id) : '—' }}</td>
            <td class="px-3 py-2">{{ fmt.format(p.price) }}</td>
            <td class="px-3 py-2">{{ p.is_active ? 'Visible' : 'Oculto' }}</td>
            <td class="space-x-2 px-3 py-2 text-right">
              <template v-if="canEdit">
                <button class="btn btn-secondary" @click="edit(p)">Editar</button>
                <button class="btn btn-danger" @click="remove(p)">Eliminar</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>