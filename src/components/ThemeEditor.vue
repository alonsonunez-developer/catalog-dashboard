<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ThemeSchema,
  baseThemeName,
  contrastRatio,
  customizeTheme,
  fontOptions,
  radiusOptions,
  resolveTheme,
  themes,
  type Theme,
} from 'catalog-kit'

const props = defineProps<{ modelValue: unknown; disabled?: boolean; brand?: Theme | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | Theme] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

// Cerrar al hacer clic fuera del panel o con Escape
function onPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeyDown)
})

const isBrand = computed(() => props.modelValue === 'brand')
const isCustom = computed(() => typeof props.modelValue === 'object' && props.modelValue !== null)

// Tema efectivo: el nombre resuelto, el tema de marca, o el objeto si es válido
const theme = computed<Theme>(() => {
  const v = props.modelValue
  if (typeof v === 'string') return resolveTheme(v, props.brand)
  const r = ThemeSchema.safeParse(v)
  return r.success ? r.data : resolveTheme('joyeria')
})
const base = computed(() =>
  baseThemeName(typeof props.modelValue === 'string' && !isBrand.value ? props.modelValue : theme.value),
)
const selectValue = computed(() => (isBrand.value ? 'brand' : isCustom.value ? '__custom' : base.value))

const colorFields = [
  { key: 'primary', label: 'Color principal (botones, precios)' },
  { key: 'background', label: 'Fondo' },
  { key: 'surface', label: 'Tarjetas y portada' },
  { key: 'text', label: 'Texto' },
  { key: 'muted', label: 'Texto secundario' },
] as const

function pickPreset(name: string) {
  if (name !== '__custom') emit('update:modelValue', name)
}

function patch(p: Parameters<typeof customizeTheme>[1]) {
  emit('update:modelValue', customizeTheme(theme.value, p))
}

function reset() {
  emit('update:modelValue', base.value)
}

const fontValue = (current: string) => (fontOptions.some((f) => f.value === current) ? current : '__other')

const warnings = computed(() => {
  const c = theme.value.colors
  const out: string[] = []
  if (contrastRatio(c.text, c.background) < 4.5) out.push('El texto casi no se distingue del fondo.')
  if (contrastRatio(c.text, c.surface) < 4.5) out.push('El texto casi no se distingue sobre las tarjetas.')
  if (contrastRatio(c.primary, c.background) < 3) out.push('El color principal casi no se distingue del fondo (precios y títulos).')
  return out
})
</script>

<template>
  <div ref="root" class="relative flex items-center gap-2">
    <label class="label !mb-0" for="theme">Tema</label>
    <select
      id="theme"
      class="input !w-auto"
      :value="selectValue"
      :disabled="disabled"
      @change="pickPreset(($event.target as HTMLSelectElement).value)"
    >
      <option v-if="brand || isBrand" value="brand">Colores de mi negocio</option>
      <option v-if="isCustom" value="__custom">Personalizado (base: {{ base }})</option>
      <option v-for="t in Object.keys(themes)" :key="t" :value="t">{{ t }}</option>
    </select>
    <button v-if="!disabled" type="button" class="btn btn-secondary" @click="open = !open">
      {{ open ? 'Cerrar' : 'Personalizar' }}
    </button>

    <div
      v-if="open && !disabled"
      class="card absolute left-0 top-full z-20 mt-2 max-h-[80vh] w-[22rem] space-y-3 overflow-y-auto shadow-lg"
    >
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs text-neutral-500">
          <template v-if="isBrand">
            Este catálogo usa los colores de tu negocio. Si cambias algo aquí, dejará de usarlos y guardará su propia copia.
          </template>
          <template v-else>Parte de «{{ base }}». Tus cambios se guardan solo en este catálogo.</template>
        </p>
        <button type="button" class="btn btn-secondary !px-2 !py-0.5" aria-label="Cerrar panel" @click="open = false">✕</button>
      </div>

      <div v-for="f in colorFields" :key="f.key" class="flex items-center justify-between gap-3">
        <label class="text-sm" :for="`c-${f.key}`">{{ f.label }}</label>
        <div class="flex items-center gap-2">
          <code class="text-xs text-neutral-500">{{ theme.colors[f.key] }}</code>
          <input
            :id="`c-${f.key}`"
            type="color"
            class="h-8 w-10 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
            :value="theme.colors[f.key]"
            @input="patch({ colors: { [f.key]: ($event.target as HTMLInputElement).value } })"
          />
        </div>
      </div>

      <div>
        <label class="label" for="font-heading">Fuente de títulos</label>
        <select
          id="font-heading"
          class="input"
          :value="fontValue(theme.fonts.heading)"
          @change="patch({ fonts: { heading: ($event.target as HTMLSelectElement).value } })"
        >
          <option v-if="fontValue(theme.fonts.heading) === '__other'" value="__other" disabled>(personalizada)</option>
          <option v-for="o in fontOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="font-body">Fuente del texto</label>
        <select
          id="font-body"
          class="input"
          :value="fontValue(theme.fonts.body)"
          @change="patch({ fonts: { body: ($event.target as HTMLSelectElement).value } })"
        >
          <option v-if="fontValue(theme.fonts.body) === '__other'" value="__other" disabled>(personalizada)</option>
          <option v-for="o in fontOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="radius">Esquinas</label>
        <select
          id="radius"
          class="input"
          :value="theme.radius"
          @change="patch({ radius: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="o in radiusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <ul v-if="warnings.length" class="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
        <li v-for="w in warnings" :key="w">{{ w }}</li>
      </ul>

      <button v-if="brand && !isBrand" type="button" class="btn btn-secondary w-full" @click="emit('update:modelValue', 'brand')">
        Usar los colores de mi negocio
      </button>
      <button v-if="isCustom" type="button" class="btn btn-secondary w-full" @click="reset">
        Restablecer a «{{ base }}»
      </button>
    </div>
  </div>
</template>