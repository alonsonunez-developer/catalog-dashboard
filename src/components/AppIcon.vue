<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ src: string; size?: number }>(), { size: 16 })

// Máscara: el ícono toma el color del texto del elemento donde se coloque
const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  backgroundColor: 'currentColor',
  WebkitMaskImage: `url("${props.src}")`,
  maskImage: `url("${props.src}")`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
}))
</script>

<template>
  <span class="inline-block shrink-0" :style="style" aria-hidden="true" />
</template>