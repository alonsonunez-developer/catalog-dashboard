<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { loadOrganization, session } from '../lib/session'
import { errorMessage } from '../lib/data'

const router = useRouter()
const name = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    const { error: e } = await supabase.rpc('create_organization', { p_name: name.value.trim() })
    if (e) throw e
    await loadOrganization(session.value!.user.id)
    await router.push({ name: 'catalogs' })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

async function logout() {
  await supabase.auth.signOut()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
    <form class="card w-full max-w-sm space-y-4" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">Crea tu negocio</h1>
      <p class="text-sm text-neutral-600">Este nombre agrupa tus catálogos, productos y categorías.</p>
      <div>
        <label class="label" for="name">Nombre del negocio</label>
        <input id="name" v-model="name" class="input" required maxlength="120" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button class="btn btn-primary w-full" :disabled="loading || !name.trim()">
        {{ loading ? 'Creando…' : 'Continuar' }}
      </button>
      <button type="button" class="w-full cursor-pointer text-sm text-neutral-600 underline" @click="logout">
        Cerrar sesión
      </button>
    </form>
  </div>
</template>