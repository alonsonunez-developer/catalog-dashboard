<script setup lang="ts">
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { organization, role } from '../lib/session'

const router = useRouter()

const links = [
  { name: 'catalogs', label: 'Catálogos' },
  { name: 'products', label: 'Productos' },
  { name: 'categories', label: 'Categorías' },
  { name: 'attributes', label: 'Atributos' },
  { name: 'settings', label: 'Negocio' },
]

async function logout() {
  await supabase.auth.signOut()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 text-neutral-900">
    <header class="border-b bg-white">
      <div class="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
        <span class="font-semibold">{{ organization?.name }}</span>
        <nav class="flex gap-1">
          <RouterLink
            v-for="l in links"
            :key="l.name"
            :to="{ name: l.name }"
            class="rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100"
            active-class="bg-neutral-200 font-medium"
          >
            {{ l.label }}
          </RouterLink>
        </nav>
        <div class="ml-auto flex items-center gap-3 text-sm text-neutral-500">
          <span>{{ role }}</span>
          <button class="btn btn-secondary" @click="logout">Salir</button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>