<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { loadOrganization, session } from '../lib/session'
import { errorMessage } from '../lib/data'

const MIN_PASSWORD = 8

const router = useRouter()
const mode = ref<'signin' | 'signup'>('signin')
const email = ref('')
const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const googleLoading = ref(false)
const error = ref('')
const info = ref('')

const isSignup = computed(() => mode.value === 'signup')
const mismatch = computed(() => isSignup.value && confirm.value !== '' && confirm.value !== password.value)
const busy = computed(() => loading.value || googleLoading.value)

function setMode(m: 'signin' | 'signup') {
  if (mode.value === m) return
  mode.value = m
  password.value = ''
  confirm.value = ''
  showPassword.value = false
  error.value = ''
  info.value = ''
}

// Mensajes de Supabase en español para los casos más comunes
function friendly(e: unknown): string {
  const code = (e as { code?: string } | null)?.code
  const msg = errorMessage(e)
  switch (code) {
    case 'invalid_credentials':
      return 'Correo o contraseña incorrectos.'
    case 'email_not_confirmed':
      return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
    case 'user_already_exists':
    case 'email_exists':
      return 'Ya existe una cuenta con ese correo. Inicia sesión.'
    case 'weak_password':
      return `La contraseña es muy débil. Usa al menos ${MIN_PASSWORD} caracteres.`
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    case 'signup_disabled':
      return 'El registro de cuentas nuevas está cerrado por ahora.'
  }
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  return msg
}

async function submit() {
  error.value = ''
  info.value = ''
  const credentials = { email: email.value.trim(), password: password.value }

  if (isSignup.value) {
    if (password.value.length < MIN_PASSWORD) {
      error.value = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
      return
    }
    if (password.value !== confirm.value) {
      error.value = 'Las contraseñas no coinciden.'
      return
    }
  }

  loading.value = true
  try {
    const { data, error: e } = isSignup.value
      ? await supabase.auth.signUp({
          ...credentials,
          // El enlace del correo vuelve al sitio desde el que se registró (producción o local)
          options: { emailRedirectTo: window.location.origin },
        })
      : await supabase.auth.signInWithPassword(credentials)
    if (e) throw e

    if (!data.session) {
      // Con "Confirm email" activo no hay sesión hasta confirmar. Si el correo ya existía,
      // Supabase responde igual (para no revelar qué correos están registrados).
      info.value = 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.'
      setMode('signin')
      info.value = 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.'
      return
    }
    session.value = data.session
    await loadOrganization(data.session.user.id)
    await router.push({ name: 'catalogs' })
  } catch (e) {
    error.value = friendly(e)
  } finally {
    loading.value = false
  }
}

async function signInWithGoogle() {
  error.value = ''
  info.value = ''
  googleLoading.value = true
  const { error: e } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/login`,
      queryParams: { prompt: 'select_account' }, // permite elegir la cuenta de Google
    },
  })
  if (e) {
    error.value = friendly(e)
    googleLoading.value = false
  }
  // Si todo sale bien, el navegador se va a Google y regresa con la sesión iniciada
}

// Si el usuario vuelve con el botón Atrás desde Google, el botón no debe quedar bloqueado
const onPageShow = (ev: PageTransitionEvent) => {
  if (ev.persisted) googleLoading.value = false
}

onMounted(() => {
  window.addEventListener('pageshow', onPageShow)
  // Si el usuario canceló en Google o falló, Supabase vuelve con el motivo en la URL
  const params = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const reason = params.get('error_description') ?? hash.get('error_description')
  if (reason) {
    error.value = /access_denied|denied/i.test(reason)
      ? 'Cancelaste el inicio de sesión con Google.'
      : `No se pudo iniciar sesión con Google: ${reason}`
    history.replaceState({}, '', window.location.pathname)
  }
})
onBeforeUnmount(() => window.removeEventListener('pageshow', onPageShow))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
    <div class="card w-full max-w-sm space-y-4">
      <div class="flex rounded-md bg-neutral-100 p-1 text-sm" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="!isSignup"
          class="flex-1 rounded px-3 py-1.5 font-medium"
          :class="!isSignup ? 'bg-white shadow-sm' : 'text-neutral-500'"
          @click="setMode('signin')"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="isSignup"
          class="flex-1 rounded px-3 py-1.5 font-medium"
          :class="isSignup ? 'bg-white shadow-sm' : 'text-neutral-500'"
          @click="setMode('signup')"
        >
          Crear cuenta
        </button>
      </div>

      <h1 class="text-xl font-semibold">{{ isSignup ? 'Crea tu cuenta' : 'Bienvenido de nuevo' }}</h1>

      <button type="button" class="btn btn-secondary w-full gap-2" :disabled="busy" @click="signInWithGoogle">
        <svg class="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {{ googleLoading ? 'Conectando con Google…' : 'Continuar con Google' }}
      </button>

      <div class="flex items-center gap-3 text-xs text-neutral-400">
        <span class="h-px flex-1 bg-neutral-200" />
        o con tu correo
        <span class="h-px flex-1 bg-neutral-200" />
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="label" for="email">Correo</label>
          <input id="email" v-model="email" type="email" class="input" required autocomplete="email" />
        </div>

        <div>
          <label class="label" for="password">Contraseña</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="input pr-16"
              required
              :minlength="isSignup ? MIN_PASSWORD : undefined"
              :autocomplete="isSignup ? 'new-password' : 'current-password'"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-2 cursor-pointer px-1 text-xs text-neutral-500 hover:text-neutral-900"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <p v-if="isSignup" class="mt-1 text-xs text-neutral-500">Mínimo {{ MIN_PASSWORD }} caracteres.</p>
        </div>

        <div v-if="isSignup">
          <label class="label" for="confirm">Confirmar contraseña</label>
          <input
            id="confirm"
            v-model="confirm"
            :type="showPassword ? 'text' : 'password'"
            class="input"
            required
            autocomplete="new-password"
            :aria-invalid="mismatch"
          />
          <p v-if="mismatch" class="mt-1 text-xs text-red-600">Las contraseñas no coinciden.</p>
        </div>

        <p v-if="error" class="text-sm text-red-600" role="alert">{{ error }}</p>
        <p v-if="info" class="text-sm text-green-700" role="status">{{ info }}</p>

        <button class="btn btn-primary w-full" :disabled="busy || mismatch">
          {{ loading ? 'Procesando…' : isSignup ? 'Crear cuenta' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>