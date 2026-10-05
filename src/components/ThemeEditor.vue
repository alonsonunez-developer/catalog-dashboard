<script setup lang="ts">
import { computed, ref } from 'vue'
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

const props = defineProps<{ modelValue: unknown; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | Theme] }>()

const open = ref(false)

const isCustom = computed(() => typeof props.modelValue === 'object' && props.modelValue !== null)

// Tema efectivo: el nombre resuelto, o el objeto si es válido
const theme = computed<Theme>(() => {
  const v = props.modelValue
  if (typeof v === 'string') return resolveTheme(v)
  const r = ThemeSchema.safeParse(v)
  return r.success ? r.data : resolveTheme('joyeria')
})
const base = computed(() => baseThemeName(isCustom.value ? theme.value : (props.modelValue as string)))
const selectValue = computed(() => (isCustom.value ? '__custom' : base.value))

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
  <div class="relative flex items-center gap-2">
    <label class="label !mb-0" for="theme">Tema</label>
    <select
      id="theme"
      class="input !w-auto"
      :value="selectValue"
      :disabled="disabled"
      @change="pickPreset(($event.target as HTMLSelectElement).value)"
    >
      <option v-if="isCustom" value="__custom">Personalizado (base: {{ base }})</option>
      <option v-for="t in Object.keys(themes)" :key="t" :value="t">{{ t }}</option>
    </select>
    <button v-if="!disabled" type="button" class="btn btn-secondary" @click="open = !open">
      {{ open ? 'Cerrar' : 'Personalizar' }}
    </button>

    <div v-if="open && !disabled" class="card absolute left-0 top-full z-20 mt-2 w-[22rem] space-y-3 shadow-lg">
      <p class="text-xs text-neutral-500">
        Parte de «{{ base }}». Tus cambios se guardan solo en este catálogo.
      </p>

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

      <button v-if="isCustom" type="button" class="btn btn-secondary w-full" @click="reset">
        Restablecer a «{{ base }}»
      </button>
    </div>
  </div>
</template>