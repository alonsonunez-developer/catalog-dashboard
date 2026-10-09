<script setup lang="ts">
import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { organization } from '../lib/session'
import { errorMessage } from '../lib/data'

const BUCKET = 'catalog-assets'
const orphans = ref<{ name: string; size: number }[] | null>(null)
const scanning = ref(false)
const cleaning = ref(false)
const error = ref('')
const result = ref('')

const totalBytes = computed(() => (orphans.value ?? []).reduce((n, o) => n + Number(o.size), 0))
const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

async function scan() {
  scanning.value = true
  error.value = ''
  result.value = ''
  const { data, error: e } = await supabase.rpc('list_orphan_assets', { p_org: organization.value!.id })
  scanning.value = false
  if (e) {
    error.value = errorMessage(e)
    return
  }
  orphans.value = (data ?? []) as { name: string; size: number }[]
}

async function clean() {
  const list = orphans.value ?? []
  if (!list.length) return
  if (!confirm(`¿Eliminar ${list.length} archivo(s) sin usar? No se puede deshacer.`)) return
  cleaning.value = true
  error.value = ''
  let deleted = 0
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100).map((o) => o.name)
    const { data, error: e } = await supabase.storage.from(BUCKET).remove(batch)
    if (e) {
      error.value = errorMessage(e)
      break
    }
    deleted += data?.length ?? 0
  }
  cleaning.value = false
  result.value = `Se eliminaron ${deleted} de ${list.length} archivos.`
  await scan()
}
</script>

<template>
  <section class="card space-y-3">
    <h2 class="text-xl font-semibold">Almacenamiento</h2>
    <p class="text-sm text-neutral-600">
      Busca imágenes subidas que ya no usa ningún producto ni catálogo (borrador o publicado). Solo se consideran
      archivos con más de 24 horas, así que nada de lo que estés editando se pierde.
    </p>
    <button type="button" class="btn btn-secondary" :disabled="scanning || cleaning" @click="scan">
      {{ scanning ? 'Buscando…' : 'Buscar archivos sin usar' }}
    </button>

    <template v-if="orphans">
      <p v-if="!orphans.length" class="text-sm text-green-700">No hay archivos sin usar.</p>
      <div v-else class="space-y-2">
        <p class="text-sm">{{ orphans.length }} archivo(s), {{ fmtSize(totalBytes) }} en total.</p>
        <button type="button" class="btn btn-danger" :disabled="cleaning" @click="clean">
          {{ cleaning ? 'Eliminando…' : 'Eliminar archivos sin usar' }}
        </button>
      </div>
    </template>
    <p v-if="result" class="text-sm text-green-700">{{ result }}</p>
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </section>
</template>