<script setup lang="ts">
import { computed } from 'vue'
import { iconUrl, type IconName } from '../lib/icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 16 })
const url = computed(() => iconUrl(props.name))

// Máscara: el ícono toma el color del texto del elemento donde se coloque
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: 'currentColor',
  WebkitMaskImage: `url("${url.value}")`,
  maskImage: `url("${url.value}")`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
}))
</script>

<template>
  <span v-if="url" class="inline-block shrink-0" :style="style" aria-hidden="true" />
  <!-- Sin archivo de ícono se muestra el contenido de respaldo (texto o carácter) -->
  <slot v-else />
</template>