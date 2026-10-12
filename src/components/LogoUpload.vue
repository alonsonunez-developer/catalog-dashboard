<script setup lang="ts">
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { isAdmin, organization } from '../lib/session'
import { errorMessage } from '../lib/data'
import { ACCEPT_ATTR, deleteStoredImage, uploadImage, validateImage } from '../lib/storage'

const logo = computed(() => organization.value?.business.logo ?? '')
const busy = ref(false)
const error = ref('')
const done = ref('')

// Guarda (o quita) el logo dentro de los datos del negocio, conservando el resto
async function saveLogo(url: string | null) {
  const org = organization.value!
  const business = { ...org.business }
  if (url) business.logo = url
  else delete business.logo
  const { error: e } = await supabase.from('organizations').update({ business }).eq('id', org.id)
  if (e) throw e
  organization.value = { ...organization.value!, business }
}

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  done.value = ''
  const invalid = validateImage(file)
  if (invalid) {
    error.value = invalid
    return
  }
  busy.value = true
  const previous = logo.value
  let uploaded: string | null = null
  try {
    uploaded = await uploadImage(organization.value!.id, file, 600)
    await saveLogo(uploaded)
    // El logo anterior se borra solo después de guardar bien
    if (previous) await deleteStoredImage(previous)
    done.value = 'Logo guardado.'
  } catch (e) {
    error.value = errorMessage(e)
    // Si se subió pero no se pudo guardar, no se deja el archivo suelto
    if (uploaded && logo.value !== uploaded) await deleteStoredImage(uploaded)
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm('¿Quitar el logo? Dejará de aparecer en tus catálogos.')) return
  error.value = ''
  done.value = ''
  busy.value = true
  const previous = logo.value
  try {
    await saveLogo(null)
    await deleteStoredImage(previous)
    done.value = 'Logo eliminado.'
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card space-y-3">
    <h2 class="text-xl font-semibold">Logo</h2>
    <p class="text-sm text-neutral-600">
      Aparece arriba a la izquierda en las páginas de tus catálogos. En cada catálogo activas la casilla
      «Mostrar logo en las páginas», y puedes ocultarlo en páginas concretas.
    </p>
    <p v-if="!isAdmin" class="text-sm text-neutral-500">Solo un administrador puede cambiar el logo.</p>

    <div class="flex items-center gap-4">
      <div class="flex h-20 w-40 items-center justify-center rounded border border-neutral-200 bg-neutral-100 p-2">
        <img v-if="logo" :src="logo" alt="Logo del negocio" class="max-h-full max-w-full object-contain" />
        <span v-else class="text-xs text-neutral-400">Sin logo</span>
      </div>
      <div v-if="isAdmin" class="space-y-1">
        <input type="file" :accept="ACCEPT_ATTR" class="block text-sm" :disabled="busy" @change="onFile" />
        <button v-if="logo" type="button" class="text-xs text-red-700 underline" :disabled="busy" @click="remove">
          Quitar logo
        </button>
      </div>
    </div>
    <p class="text-xs text-neutral-500">
      JPG, PNG o WebP. Para que se vea bien sobre cualquier color de página, usa un PNG o WebP con fondo transparente.
    </p>
    <p v-if="busy" class="text-xs text-neutral-500">Procesando…</p>
    <p v-if="done" class="text-sm text-green-700">{{ done }}</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </section>
</template>