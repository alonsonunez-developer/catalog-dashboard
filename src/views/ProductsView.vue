<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import {
  errorMessage,
  fetchCategories,
  fetchProducts,
  type AttributeValue,
  type Category,
  type Product,
} from '../lib/data'
import { ACCEPT_ATTR, deleteStoredImage, uploadProductImage, validateImage } from '../lib/storage'

interface Photo {
  key: string
  url: string // URL ya guardada ('' si todavía es un archivo por subir)
  file: File | null
  preview: string
}

const MAX_PHOTOS = 8 // la principal + 7 en la galería (coincide con el límite de la base)
let seq = 0
const newKey = () => `ph${seq++}`

const orgId = () => organization.value!.id
const defs = computed(() => organization.value!.attribute_defs ?? [])
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
  compare_at_price: '' as number | '',
  sku: '',
  description: '',
  photos: [] as Photo[],
  originalPhotos: [] as string[], // URLs guardadas al abrir el formulario
  category_id: '',
  is_active: true,
  // Valores de los atributos definidos; las listas se escriben separadas por comas
  attrs: Object.fromEntries(defs.value.map((d) => [d.key, ''])) as Record<string, string>,
  // Valores de atributos que ya no están definidos: se conservan tal cual
  extraAttributes: {} as Record<string, AttributeValue>,
})
const form = ref(emptyForm())

function revokePreviews() {
  form.value.photos.forEach((p) => p.file && URL.revokeObjectURL(p.preview))
}
onBeforeUnmount(revokePreviews)

function onFiles(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  error.value = ''
  for (const file of files) {
    if (form.value.photos.length >= MAX_PHOTOS) {
      error.value = `Máximo ${MAX_PHOTOS} fotos por producto.`
      break
    }
    const invalid = validateImage(file)
    if (invalid) {
      error.value = invalid
      continue
    }
    form.value.photos.push({ key: newKey(), url: '', file, preview: URL.createObjectURL(file) })
  }
}

function removePhoto(i: number) {
  const [p] = form.value.photos.splice(i, 1)
  if (p?.file) URL.revokeObjectURL(p.preview)
}

function movePhoto(i: number, delta: number) {
  const list = form.value.photos
  const j = i + delta
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

function makeMain(i: number) {
  const list = form.value.photos
  const [p] = list.splice(i, 1)
  list.unshift(p)
}

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
  revokePreviews()
  form.value = emptyForm()
  showForm.value = true
}

const storedPhotos = (p: Product) => [p.image_url, ...p.gallery].filter((u): u is string => !!u)

function edit(p: Product) {
  revokePreviews()
  const known = new Set(defs.value.map((d) => d.key))
  const attrs: Record<string, string> = {}
  const extra: Record<string, AttributeValue> = {}
  for (const d of defs.value) {
    const v = p.attributes[d.key]
    attrs[d.key] = Array.isArray(v) ? v.join(', ') : (v ?? '')
  }
  for (const [k, v] of Object.entries(p.attributes)) if (!known.has(k)) extra[k] = v
  const urls = storedPhotos(p)
  form.value = {
    id: p.id,
    name: p.name,
    price: p.price,
    compare_at_price: p.compare_at_price ?? '',
    sku: p.sku ?? '',
    description: p.description ?? '',
    photos: urls.map((url) => ({ key: newKey(), url, file: null, preview: url })),
    originalPhotos: urls,
    category_id: p.category_id ?? '',
    is_active: p.is_active,
    attrs,
    extraAttributes: extra,
  }
  showForm.value = true
}

function cancel() {
  revokePreviews()
  showForm.value = false
}

function buildAttributes(): Record<string, AttributeValue> {
  const f = form.value
  const out: Record<string, AttributeValue> = { ...f.extraAttributes }
  for (const d of defs.value) {
    const raw = (f.attrs[d.key] ?? '').trim()
    if (!raw) continue
    out[d.key] = d.type === 'list' ? raw.split(',').map((s) => s.trim()).filter(Boolean) : raw
  }
  return out
}

async function save() {
  error.value = ''
  const f = form.value
  const compareAt = f.compare_at_price === '' || f.compare_at_price == null ? null : Number(f.compare_at_price)
  if (compareAt !== null && compareAt < f.price) {
    error.value = 'El precio anterior debe ser mayor o igual al precio actual (o déjalo vacío).'
    return
  }

  saving.value = true
  const uploaded: string[] = [] // para limpiar si algo falla antes de guardar el producto
  try {
    const urls: string[] = []
    for (const p of f.photos) {
      if (p.file) {
        const url = await uploadProductImage(orgId(), p.file)
        uploaded.push(url)
        urls.push(url)
      } else {
        urls.push(p.url)
      }
    }
    const payload = {
      name: f.name.trim(),
      price: f.price,
      compare_at_price: compareAt,
      sku: f.sku.trim() || null,
      description: f.description.trim() || null,
      image_url: urls[0] ?? null,
      gallery: urls.slice(1),
      category_id: f.category_id || null,
      is_active: f.is_active,
      attributes: buildAttributes(),
    }
    const { error: e } = f.id
      ? await supabase.from('products').update(payload).eq('id', f.id)
      : await supabase.from('products').insert({ ...payload, organization_id: orgId() })
    if (e) throw e

    uploaded.length = 0 // ya están en uso: no se limpian
    // Las fotos quitadas se borran de Storage solo después de guardar bien
    const keep = new Set(urls)
    for (const old of f.originalPhotos) if (!keep.has(old)) await deleteStoredImage(old)
    revokePreviews()
    showForm.value = false
    await load()
  } catch (e) {
    error.value = errorMessage(e)
    for (const u of uploaded) await deleteStoredImage(u)
  } finally {
    saving.value = false
  }
}

async function remove(p: Product) {
  if (!confirm(`¿Eliminar "${p.name}"?`)) return
  error.value = ''
  const { error: e } = await supabase.from('products').delete().eq('id', p.id)
  if (e) {
    error.value = errorMessage(e)
    return
  }
  for (const u of storedPhotos(p)) await deleteStoredImage(u)
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
        <label class="label" for="p-sku">Código (SKU)</label>
        <input id="p-sku" v-model="form.sku" class="input" maxlength="60" />
      </div>
      <div>
        <label class="label" for="p-price">Precio ({{ organization?.currency }})</label>
        <input id="p-price" v-model.number="form.price" type="number" step="0.01" min="0" class="input" required />
      </div>
      <div>
        <label class="label" for="p-compare">Precio anterior (opcional, se muestra tachado)</label>
        <input id="p-compare" v-model.number="form.compare_at_price" type="number" step="0.01" min="0" class="input" />
      </div>
      <div>
        <label class="label" for="p-cat">Categoría</label>
        <select id="p-cat" v-model="form.category_id" class="input">
          <option value="">Sin categoría</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>

      <div class="md:col-span-2">
        <label class="label" for="p-files">Fotos ({{ form.photos.length }}/{{ MAX_PHOTOS }})</label>
        <ul v-if="form.photos.length" class="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <li v-for="(ph, i) in form.photos" :key="ph.key" class="space-y-1 rounded-md border border-neutral-200 p-1.5">
            <div class="relative">
              <img :src="ph.preview" alt="" class="aspect-square w-full rounded object-cover" />
              <span
                v-if="i === 0"
                class="absolute left-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white"
              >
                Principal
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              <button type="button" class="btn btn-secondary !px-1.5 !py-0.5" :disabled="i === 0" title="Mover antes" @click="movePhoto(i, -1)">←</button>
              <button type="button" class="btn btn-secondary !px-1.5 !py-0.5" :disabled="i === form.photos.length - 1" title="Mover después" @click="movePhoto(i, 1)">→</button>
              <button v-if="i > 0" type="button" class="btn btn-secondary !px-1.5 !py-0.5 text-xs" @click="makeMain(i)">Principal</button>
              <button type="button" class="btn btn-danger !px-1.5 !py-0.5" title="Quitar foto" @click="removePhoto(i)">✕</button>
            </div>
          </li>
        </ul>
        <input
          id="p-files"
          type="file"
          multiple
          :accept="ACCEPT_ATTR"
          class="block text-sm"
          :disabled="form.photos.length >= MAX_PHOTOS"
          @change="onFiles"
        />
        <p class="mt-1 text-xs text-neutral-500">
          JPG, PNG o WebP. La primera es la principal; las demás forman la galería. Se optimizan al guardar.
        </p>
      </div>

      <div class="md:col-span-2">
        <label class="label" for="p-desc">Descripción</label>
        <textarea id="p-desc" v-model="form.description" rows="2" class="input" />
      </div>

      <fieldset class="grid gap-3 rounded-md border border-neutral-200 p-3 md:col-span-2 md:grid-cols-2">
        <legend class="px-1 text-sm font-medium text-neutral-700">Atributos</legend>
        <p v-if="!defs.length" class="text-sm text-neutral-500 md:col-span-2">
          Aún no definiste atributos (tallas, colores, sabores…).
          <RouterLink :to="{ name: 'attributes' }" class="underline">Definirlos</RouterLink>
        </p>
        <div v-for="d in defs" :key="d.key">
          <label class="label" :for="`a-${d.key}`">{{ d.label }}</label>
          <input
            :id="`a-${d.key}`"
            v-model="form.attrs[d.key]"
            class="input"
            :placeholder="d.type === 'list' ? 'Separados por comas: S, M, L' : ''"
          />
        </div>
      </fieldset>

      <label class="flex items-center gap-2 text-sm md:col-span-2">
        <input v-model="form.is_active" type="checkbox" /> Visible en el catálogo
      </label>
      <div class="flex gap-2 md:col-span-2">
        <button class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="cancel">Cancelar</button>
      </div>
    </form>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!products.length" class="text-sm text-neutral-500">Aún no hay productos.</p>
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
          <tr v-for="p in products" :key="p.id" class="border-b last:border-0">
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