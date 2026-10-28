<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { SLUG_RE, errorMessage, slugify } from '../lib/data'
import { updateCatalogMeta } from '../lib/catalogs'

const props = defineProps<{ id: string; name: string; slug: string; published: boolean }>()
const emit = defineEmits<{ close: []; saved: [meta: { name: string; slug: string }] }>()

const name = ref(props.name)
const slug = ref(props.slug)
const slugTouched = ref(false)
const saving = ref(false)
const error = ref('')
const nameInput = ref<HTMLInputElement | null>(null)

const slugValid = computed(() => SLUG_RE.test(slug.value) && slug.value.length <= 60)
const slugChanged = computed(() => slug.value !== props.slug)
const unchanged = computed(() => name.value.trim() === props.name && !slugChanged.value)

function onName() {
  // Mientras no toques la dirección, sigue al nombre solo si todavía no estaba publicado
  if (!slugTouched.value && !props.published) slug.value = slugify(name.value)
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    await updateCatalogMeta(props.id, { name: name.value, slug: slug.value })
    emit('saved', { name: name.value.trim(), slug: slug.value })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && !saving.value) emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  nameInput.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="!saving && emit('close')">
    <form class="w-full max-w-md space-y-4 rounded-lg bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="meta-title" @submit.prevent="save">
      <h2 id="meta-title" class="text-lg font-semibold">Nombre y dirección</h2>
      <div>
        <label class="label" for="meta-name">Nombre del catálogo</label>
        <input id="meta-name" ref="nameInput" v-model="name" class="input" required maxlength="120" @input="onName" />
      </div>
      <div>
        <label class="label" for="meta-slug">Dirección (slug)</label>
        <input id="meta-slug" v-model="slug" class="input" required maxlength="60" @input="slugTouched = true" />
        <p v-if="slug && !slugValid" class="mt-1 text-xs text-red-600">Solo minúsculas, números y guiones.</p>
      </div>
      <p v-if="published && slugChanged" class="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
        Este catálogo está publicado. Si cambias la dirección, el enlace anterior, los QR y los mensajes ya compartidos
        dejarán de funcionar. Tendrás que compartir el enlace nuevo.
      </p>
      <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-secondary" :disabled="saving" @click="emit('close')">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving || !name.trim() || !slugValid || unchanged">
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </form>
  </div>
</template>