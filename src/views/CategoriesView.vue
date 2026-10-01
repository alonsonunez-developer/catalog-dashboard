<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { canEdit, organization } from '../lib/session'
import { errorMessage, fetchCategories, type Category } from '../lib/data'

const orgId = () => organization.value!.id
const categories = ref<Category[]>([])
const newName = ref('')
const loading = ref(true)
const error = ref('')

async function load() {
  try {
    categories.value = await fetchCategories(orgId())
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function add() {
  const name = newName.value.trim()
  if (!name) return
  error.value = ''
  const { error: e } = await supabase
    .from('categories')
    .insert({ organization_id: orgId(), name, position: categories.value.length })
  if (e) {
    error.value = errorMessage(e)
    return
  }
  newName.value = ''
  await load()
}

async function rename(c: Category, ev: Event) {
  const input = ev.target as HTMLInputElement
  const name = input.value.trim()
  if (!name || name === c.name) {
    input.value = c.name
    return
  }
  error.value = ''
  const { error: e } = await supabase.from('categories').update({ name }).eq('id', c.id)
  if (e) {
    error.value = errorMessage(e)
    input.value = c.name
    return
  }
  c.name = name
}

async function remove(c: Category) {
  if (!confirm(`¿Eliminar la categoría "${c.name}"? Sus productos quedarán sin categoría.`)) return
  error.value = ''
  const { error: e } = await supabase.from('categories').delete().eq('id', c.id)
  if (e) error.value = errorMessage(e)
  await load()
}
</script>

<template>
  <div class="max-w-xl space-y-4">
    <h1 class="text-2xl font-semibold">Categorías</h1>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <form v-if="canEdit" class="flex gap-2" @submit.prevent="add">
      <input v-model="newName" class="input" placeholder="Nueva categoría" maxlength="120" />
      <button class="btn btn-primary" :disabled="!newName.trim()">Agregar</button>
    </form>

    <p v-if="loading" class="text-sm text-neutral-500">Cargando…</p>
    <p v-else-if="!categories.length" class="text-sm text-neutral-500">Aún no hay categorías.</p>
    <ul v-else class="space-y-2">
      <li v-for="c in categories" :key="c.id" class="card flex items-center gap-2 !p-2">
        <input class="input" :value="c.name" :disabled="!canEdit" maxlength="120" @change="rename(c, $event)" />
        <button v-if="canEdit" class="btn btn-danger" @click="remove(c)">Eliminar</button>
      </li>
    </ul>
  </div>
</template>