<script setup lang="ts">
import { APP_NAME, brandLogoUrl } from '../lib/brand'
</script>

<template>
  <RouterLink to="/" class="flex items-center gap-2" :title="APP_NAME">
    <img v-if="brandLogoUrl" :src="brandLogoUrl" :alt="APP_NAME" class="h-7 w-auto" />
    <template v-else>
      <span class="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 text-sm font-bold text-white" aria-hidden="true">
        {{ APP_NAME.charAt(0) }}
      </span>
      <span class="font-semibold">{{ APP_NAME }}</span>
    </template>
  </RouterLink>
</template>