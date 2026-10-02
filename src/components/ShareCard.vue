<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{ url: string; name: string; slug: string }>()

const qr = ref('')
const copied = ref(false)
const copyFailed = ref(false)

async function renderQr() {
  try {
    qr.value = await QRCode.toDataURL(props.url, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
  } catch {
    qr.value = ''
  }
}
onMounted(renderQr)
watch(() => props.url, renderQr)

async function copy() {
  copyFailed.value = false
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Sin permiso de portapapeles: el campo de texto queda seleccionable
    copyFailed.value = true
  }
}

const whatsappUrl = () => `https://wa.me/?text=${encodeURIComponent(`${props.name} ${props.url}`)}`
</script>

<template>
  <section class="card flex flex-col gap-4 sm:flex-row sm:items-center">
    <img v-if="qr" :src="qr" :alt="`Código QR de ${name}`" class="h-32 w-32 rounded border border-neutral-200" />
    <div class="min-w-0 flex-1 space-y-2">
      <p class="text-sm font-medium">Compartir catálogo</p>
      <div class="flex gap-2">
        <input
          :value="url"
          readonly
          class="input"
          aria-label="Enlace del catálogo"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <button type="button" class="btn btn-secondary shrink-0" @click="copy">
          {{ copied ? '¡Copiado!' : 'Copiar enlace' }}
        </button>
      </div>
      <p v-if="copyFailed" class="text-xs text-red-600">No se pudo copiar automáticamente; selecciona el enlace y cópialo.</p>
      <div class="flex flex-wrap gap-2">
        <a v-if="qr" :href="qr" :download="`qr-${slug}.png`" class="btn btn-secondary">Descargar QR</a>
        <a :href="whatsappUrl()" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  </section>
</template>