<script setup lang="ts">
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { organization, role } from '../lib/session'
import type { IconName } from '../lib/icons'
import AppIcon from '../components/AppIcon.vue'
import BrandMark from '../components/BrandMark.vue'

const router = useRouter()

const links: { name: string; label: string; icon: IconName }[] = [
  { name: 'catalogs', label: 'Catálogos', icon: 'catalogs' },
  { name: 'products', label: 'Productos', icon: 'products' },
  { name: 'categories', label: 'Categorías', icon: 'categories' },
  { name: 'attributes', label: 'Atributos', icon: 'attributes' },
  { name: 'settings', label: 'Negocio', icon: 'settings' },
]

async function logout() {
  await supabase.auth.signOut()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50 text-neutral-900">
    <header class="border-b bg-white">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <BrandMark />
        <span class="hidden text-sm text-neutral-500 sm:inline">{{ organization?.name }}</span>
        <nav class="flex flex-wrap gap-1">
          <RouterLink
            v-for="l in links"
            :key="l.name"
            :to="{ name: l.name }"
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm hover:bg-neutral-100"
            active-class="bg-neutral-200 font-medium"
          >
            <AppIcon :name="l.icon" :size="16" />
            {{ l.label }}
          </RouterLink>
        </nav>
        <div class="ml-auto flex items-center gap-3 text-sm text-neutral-500">
          <span>{{ role }}</span>
          <button class="btn btn-secondary gap-1.5" @click="logout">
            <AppIcon name="logout" :size="16" />
            Salir
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView :key="$route.fullPath" />
    </main>
  </div>
</template>