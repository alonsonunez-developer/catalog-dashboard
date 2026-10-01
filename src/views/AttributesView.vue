<script setup lang="ts">
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { isAdmin, organization, type AttributeDef } from '../lib/session'
import { attributeKey, errorMessage } from '../lib/data'

const org = organization.value!
const defs = ref<AttributeDef[]>(org.attribute_defs.map((d) => ({ ...d })))
const newLabel = ref('')
const newType = ref<'text' | 'list'>('list')
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const presets = [
  { name: 'Ropa', items: [{ label: 'Tallas', type: 'list' as const }, { label: 'Color', type: 'text' as const }] },
  { name: 'Calzado', items: [{ label: 'Tallas', type: 'list' as const }, { label: 'Colores', type: 'list' as const }] },
  { name: 'Pastelería', items: [{ label: 'Sabores', type: 'list' as const }, { label: 'Tamaños', type: 'list' as const }] },
]

function addDef(label: string, type: 'text' | 'list') {
  const clean = label.trim()
  if (!clean) return
  // Si ya existe un atributo con ese nombre, no se duplica
  if (defs.value.some((d) => d.label.toLowerCase() === clean.toLowerCase())) return
  const key = attributeKey(clean, new Set(defs.value.map((d) => d.key)))
  defs.value.push({ key, label: clean, type })
  saved.value = false
}

function add() {
  addDef(newLabel.value, newType.value)
  newLabel.value = ''
}

function addPreset(items: { label: string; type: 'text' | 'list' }[]) {
  items.forEach((i) => addDef(i.label, i.type))
}

function remove(d: AttributeDef) {
  if (!confirm(`¿Quitar "${d.label}"? Los valores ya guardados en los productos no se borran, pero dejarán de mostrarse.`)) return
  defs.value = defs.value.filter((x) => x.key !== d.key)
  saved.value = false
}

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false
  const clean = defs.value.map((d) => ({ key: d.key, label: d.label.trim(), type: d.type })).filter((d) => d.label)
  const { error: e } = await supabase.from('organizations').update({ attribute_defs: clean }).eq('id', org.id)
  saving.value = false
  if (e) {
    error.value = errorMessage(e)
    return
  }
  defs.value = clean
  organization.value = { ...organization.value!, attribute_defs: clean }
  saved.value = true
}
</script>

<template>
  <div class="max-w-xl space-y-4">
    <h1 class="text-2xl font-semibold">Atributos de producto</h1>
    <p class="text-sm text-neutral-600">
      Son los datos extra que tienen tus productos: tallas y color en un vestido, sabores y tamaños en un pastel.
      Una vez definidos aparecen en el formulario de cada producto y en el catálogo.
    </p>
    <p v-if="!isAdmin" class="text-sm text-neutral-500">Solo un administrador puede editar los atributos.</p>

    <div v-if="isAdmin" class="card space-y-2">
      <p class="text-sm font-medium">Atajos</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="p in presets" :key="p.name" type="button" class="btn btn-secondary" @click="addPreset(p.items)">
          + {{ p.name }}
        </button>
      </div>
    </div>

    <ul v-if="defs.length" class="space-y-2">
      <li v-for="d in defs" :key="d.key" class="card flex items-center gap-2 !p-2">
        <input v-model="d.label" class="input" maxlength="40" :disabled="!isAdmin" @input="saved = false" />
        <select v-model="d.type" class="input !w-44" :disabled="!isAdmin" @change="saved = false">
          <option value="text">Texto</option>
          <option value="list">Lista (varios)</option>
        </select>
        <button v-if="isAdmin" type="button" class="btn btn-danger" @click="remove(d)">Quitar</button>
      </li>
    </ul>
    <p v-else class="text-sm text-neutral-500">Aún no hay atributos.</p>

    <form v-if="isAdmin" class="flex gap-2" @submit.prevent="add">
      <input v-model="newLabel" class="input" placeholder="Nuevo atributo (por ejemplo, Material)" maxlength="40" />
      <select v-model="newType" class="input !w-44">
        <option value="list">Lista (varios)</option>
        <option value="text">Texto</option>
      </select>
      <button class="btn btn-secondary" :disabled="!newLabel.trim()">Agregar</button>
    </form>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="saved" class="text-sm text-green-700">Guardado.</p>
    <button v-if="isAdmin" class="btn btn-primary" :disabled="saving" @click="save">
      {{ saving ? 'Guardando…' : 'Guardar atributos' }}
    </button>
  </div>
</template>