<script setup lang="ts">
import BrandMark from '../components/BrandMark.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6 text-center">
    <BrandMark />
    <p class="text-5xl font-semibold text-neutral-300">404</p>
    <h1 class="text-xl font-semibold">Esta página no existe</h1>
    <p class="max-w-sm text-sm text-neutral-600">El enlace puede estar mal escrito o la página ya no está disponible.</p>
    <RouterLink to="/" class="btn btn-primary">Ir al inicio</RouterLink>
  </div>
</template>