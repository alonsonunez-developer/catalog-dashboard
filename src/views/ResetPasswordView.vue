<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { session } from '../lib/session'
import { errorMessage } from '../lib/data'

const MIN_PASSWORD = 8
const router = useRouter()

// 'checking' mientras Supabase procesa el enlace; 'ready' con sesión de recuperación; 'invalid' si no hay
const state = ref<'checking' | 'ready' | 'invalid'>('checking')
const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const mismatch = computed(() => confirm.value !== '' && confirm.value !== password.value)

let unsubscribe: (() => void) | null = null
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  // El enlace del correo trae el código o los tokens en la URL; el cliente los procesa solo.
  const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && s)) state.value = 'ready'
  })
  unsubscribe = () => sub.subscription.unsubscribe()

  const { data } = await supabase.auth.getSession()
  if (data.session) state.value = 'ready'
  else {
    // Se espera un momento a que el cliente termine de procesar el enlace
    timer = setTimeout(() => {
      if (state.value === 'checking') state.value = 'invalid'
    }, 4000)
  }
})
onBeforeUnmount(() => {
  unsubscribe?.()
  if (timer) clearTimeout(timer)
})

async function submit() {
  error.value = ''
  if (password.value.length < MIN_PASSWORD) {
    error.value = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  loading.value = true
  try {
    const { error: e } = await supabase.auth.updateUser({ password: password.value })
    if (e) throw e
    // Se cierra la sesión de recuperación y se entra de nuevo con la contraseña nueva
    await supabase.auth.signOut()
    session.value = null
    await router.replace({ name: 'login', query: { reset: '1' } })
  } catch (e) {
    const code = (e as { code?: string } | null)?.code
    error.value =
      code === 'same_password'
        ? 'La nueva contraseña debe ser distinta de la anterior.'
        : code === 'weak_password'
          ? `La contraseña es muy débil. Usa al menos ${MIN_PASSWORD} caracteres.`
          : errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
    <div class="card w-full max-w-sm space-y-4">
      <p v-if="state === 'checking'" class="text-sm text-neutral-600">Verificando enlace…</p>

      <template v-else-if="state === 'invalid'">
        <h1 class="text-xl font-semibold">Enlace no válido</h1>
        <p class="text-sm text-neutral-600">
          El enlace expiró o ya se usó. Pide uno nuevo desde la pantalla de inicio de sesión.
        </p>
        <RouterLink :to="{ name: 'login' }" class="btn btn-primary w-full">Volver al inicio de sesión</RouterLink>
      </template>

      <form v-else class="space-y-4" @submit.prevent="submit">
        <h1 class="text-xl font-semibold">Elige una contraseña nueva</h1>
        <div>
          <label class="label" for="new-password">Contraseña nueva</label>
          <div class="relative">
            <input
              id="new-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="input pr-16"
              required
              :minlength="MIN_PASSWORD"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-2 cursor-pointer px-1 text-xs text-neutral-500 hover:text-neutral-900"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <p class="mt-1 text-xs text-neutral-500">Mínimo {{ MIN_PASSWORD }} caracteres.</p>
        </div>
        <div>
          <label class="label" for="confirm-new">Confirmar contraseña</label>
          <input
            id="confirm-new"
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
        <button class="btn btn-primary w-full" :disabled="loading || mismatch">
          {{ loading ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
      </form>
    </div>
  </div>
</template>