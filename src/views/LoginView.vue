<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { loadOrganization, session } from '../lib/session'
import { errorMessage } from '../lib/data'

const router = useRouter()
const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const info = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  info.value = ''
  try {
    const credentials = { email: email.value.trim(), password: password.value }
    const { data, error: e } =
      mode.value === 'signup'
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials)
    if (e) throw e
    if (!data.session) {
      info.value = 'Te enviamos un correo para confirmar tu cuenta. Después inicia sesión.'
      mode.value = 'signin'
      return
    }
    session.value = data.session
    await loadOrganization(data.session.user.id)
    await router.push({ name: 'catalogs' })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
    <form class="card w-full max-w-sm space-y-4" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">{{ mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta' }}</h1>
      <div>
        <label class="label" for="email">Correo</label>
        <input id="email" v-model="email" type="email" class="input" required autocomplete="email" />
      </div>
      <div>
        <label class="label" for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="input"
          required
          minlength="6"
          :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
        />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="info" class="text-sm text-green-700">{{ info }}</p>
      <button class="btn btn-primary w-full" :disabled="loading">
        {{ loading ? 'Procesando…' : mode === 'signin' ? 'Entrar' : 'Registrarme' }}
      </button>
      <button
        type="button"
        class="w-full cursor-pointer text-sm text-neutral-600 underline"
        @click="mode = mode === 'signin' ? 'signup' : 'signin'"
      >
        {{ mode === 'signin' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
      </button>
    </form>
  </div>
</template>