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
import { removeImageBackground } from '../lib/removeBg'

interface Photo {
  key: string
  url: string // URL ya guardada ('' si todavía es un archivo por subir)
  file: File | null
  preview: string
  // Estado anterior a quitar el fondo, para poder restaurarlo
  backup: { url: string; file: File | null; preview: string } | null
  busy: boolean
  progress: number
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

function revokePhoto(p: Photo) {
  if (p.file) URL.revokeObjectURL(p.preview)
  if (p.backup?.file) URL.revokeObjectURL(p.backup.preview)
}
function revokePreviews() {
  form.value.photos.forEach(revokePhoto)
}
onBeforeUnmount(revokePreviews)

const anyBusy = computed(() => form.value.photos.some((p) => p.busy))

function newPhoto(url: string, file: File | null, preview: string): Photo {
  return { key: newKey(), url, file, preview, backup: null, busy: false, progress: 0 }
}

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
    form.value.photos.push(newPhoto('', file, URL.createObjectURL(file)))
  }
}

function removePhoto(i: number) {
  const [p] = form.value.photos.splice(i, 1)
  if (p) revokePhoto(p)
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

// ===== Quitar fondo =====
async function removeBg(ph: Photo) {
  if (ph.busy) return
  error.value = ''
  ph.busy = true
  ph.progress = 0
  try {
    // Foto nueva: el archivo elegido. Foto guardada: se descarga de su URL.
    const source: Blob = ph.file ?? (await (await fetch(ph.url)).blob())
    const blob = await removeImageBackground(source, (pct) => {
      ph.progress = pct
    })
    // Si mientras tanto se quitó la foto o se cerró el formulario, se descarta el resultado
    if (!form.value.photos.some((p) => p.key === ph.key)) return
    const file = new File([blob], 'sin-fondo.png', { type: 'image/png' })
    if (ph.backup?.file) URL.revokeObjectURL(ph.backup.preview)
    // El primer original se conserva aunque se procese varias veces
    const backup = ph.backup ?? { url: ph.url, file: ph.file, preview: ph.preview }
    if (ph.backup && ph.file) URL.revokeObjectURL(ph.preview)
    ph.backup = backup
    ph.url = ''
    ph.file = file
    ph.preview = URL.createObjectURL(file)
  } catch (e) {
    error.value = `No se pudo quitar el fondo: ${errorMessage(e)}`
  } finally {
    ph.busy = false
  }
}

function restoreOriginal(ph: Photo) {
  if (!ph.backup || ph.busy) return
  if (ph.file) URL.revokeObjectURL(ph.preview)
  ph.url = ph.backup.url
  ph.file = ph.backup.file
  ph.preview = ph.backup.preview
  ph.backup = null
}

const checker = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg,#e5e5e5 25%,transparent 25%),linear-gradient(-45deg,#e5e5e5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e5e5 75%),linear-gradient(-45deg,transparent 75%,#e5e5e5 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
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
    photos: urls.map((url) => newPhoto(url, null, url)),
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
  if (anyBusy.value) {
    error.value = 'Espera a que termine de quitarse el fondo de las fotos.'
    return
  }
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
    // Las fotos quitadas o reemplazadas se borran de Storage solo después de guardar bien
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
            <div class="relative aspect-square w-full overflow-hidden rounded" :style="checker">
              <img :src="ph.preview" alt="" class="h-full w-full object-contain" />
              <span
                v-if="i === 0"
                class="absolute left-1 top-1 rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white"
              >
                Principal
              </span>
              <span
                v-if="ph.backup && !ph.busy"
                class="absolute bottom-1 left-1 rounded bg-green-700 px-1.5 py-0.5 text-[10px] text-white"
              >
                Sin fondo
              </span>
              <div
                v-if="ph.busy"
                class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 text-xs text-neutral-700"
              >
                <span>Quitando fondo…</span>
                <span v-if="ph.progress">{{ ph.progress }}%</span>
                <span class="px-2 text-center text-[10px] text-neutral-500">La primera vez descarga el modelo</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-1">
              <button type="button" class="btn btn-secondary !px-1.5 !py-0.5" :disabled="i === 0" title="Mover antes" @click="movePhoto(i, -1)">←</button>
              <button type="button" class="btn btn-secondary !px-1.5 !py-0.5" :disabled="i === form.photos.length - 1" title="Mover después" @click="movePhoto(i, 1)">→</button>
              <button v-if="i > 0" type="button" class="btn btn-secondary !px-1.5 !py-0.5 text-xs" @click="makeMain(i)">Principal</button>
              <button type="button" class="btn btn-danger !px-1.5 !py-0.5" title="Quitar foto" @click="removePhoto(i)">✕</button>
            </div>
            <div class="flex flex-wrap gap-1">
              <button
                v-if="!ph.backup"
                type="button"
                class="btn btn-secondary !px-1.5 !py-0.5 text-xs"
                :disabled="ph.busy || saving"
                @click="removeBg(ph)"
              >
                Quitar fondo
              </button>
              <button
                v-else
                type="button"
                class="btn btn-secondary !px-1.5 !py-0.5 text-xs"
                :disabled="ph.busy || saving"
                @click="restoreOriginal(ph)"
              >
                Restaurar original
              </button>
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
          «Quitar fondo» funciona mejor con productos de contorno claro sobre un fondo liso.
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
        <button class="btn btn-primary" :disabled="saving || anyBusy">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
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