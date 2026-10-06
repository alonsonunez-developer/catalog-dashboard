<script setup lang="ts">
import { computed, ref } from 'vue'
import { ThemeSchema, resolveTheme, sampleCatalog, type Theme } from 'catalog-kit'
import { supabase } from '../lib/supabase'
import { isAdmin, organization } from '../lib/session'
import { errorMessage } from '../lib/data'
import ThemeEditor from '../components/ThemeEditor.vue'
import PageThumb from '../components/PageThumb.vue'

const org = organization.value!
const form = ref({
  name: org.name,
  currency: org.currency,
  tagline: org.business.tagline ?? '',
  phone: org.business.phone ?? '',
  email: org.business.email ?? '',
  whatsapp: org.business.whatsapp ?? '',
  instagram: org.business.instagram ?? '',
  address: org.business.address ?? '',
})
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const businessFields = [
  { key: 'tagline', label: 'Lema' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'email', label: 'Correo' },
  { key: 'whatsapp', label: 'WhatsApp (con lada)' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'address', label: 'Dirección' },
] as const

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false
  const f = form.value
  const business: Record<string, string> = {}
  for (const { key } of businessFields) {
    const v = f[key].trim()
    if (v) business[key] = v
  }
  const { error: e } = await supabase
    .from('organizations')
    .update({ name: f.name.trim(), currency: f.currency.trim().toUpperCase(), business })
    .eq('id', org.id)
  saving.value = false
  if (e) {
    error.value = errorMessage(e)
    return
  }
  organization.value = {
    ...organization.value!,
    name: f.name.trim(),
    currency: f.currency.trim().toUpperCase(),
    business,
  }
  saved.value = true
}

// ===== Tema del negocio =====
const brandDraft = ref<Theme | null>(org.brand_theme ?? null)
const savingBrand = ref(false)
const brandError = ref('')
const brandSaved = ref(false)

function onBrandChange(value: string | Theme) {
  brandDraft.value = typeof value === 'string' ? resolveTheme(value) : value
  brandSaved.value = false
}

async function saveBrand(theme: Theme | null) {
  brandError.value = ''
  brandSaved.value = false
  if (theme && !ThemeSchema.safeParse(theme).success) {
    brandError.value = 'El tema no es válido.'
    return
  }
  savingBrand.value = true
  const { error: e } = await supabase.from('organizations').update({ brand_theme: theme }).eq('id', org.id)
  savingBrand.value = false
  if (e) {
    brandError.value = errorMessage(e)
    return
  }
  brandDraft.value = theme
  organization.value = { ...organization.value!, brand_theme: theme }
  brandSaved.value = true
}

// Vista previa con datos de ejemplo
const previewPage = computed(() => ({
  version: 2,
  theme: brandDraft.value ?? 'joyeria',
  pages: [
    { id: 'a', layout: 'Cover', props: { title: form.value.name }, slots: {} },
    {
      id: 'b',
      layout: 'ProductGrid8',
      props: { title: 'Productos' },
      slots: { products: sampleCatalog.products.slice(0, 4).map((p) => p.id) },
    },
  ],
}))
</script>

<template>
  <div class="max-w-xl space-y-6">
    <form class="card space-y-3" @submit.prevent="save">
      <h1 class="text-2xl font-semibold">Datos del negocio</h1>
      <p v-if="!isAdmin" class="text-sm text-neutral-500">Solo un administrador puede editar estos datos.</p>
      <div>
        <label class="label" for="s-name">Nombre</label>
        <input id="s-name" v-model="form.name" class="input" required maxlength="120" :disabled="!isAdmin" />
      </div>
      <div>
        <label class="label" for="s-cur">Moneda (código ISO, por ejemplo MXN)</label>
        <input id="s-cur" v-model="form.currency" class="input" required maxlength="3" minlength="3" :disabled="!isAdmin" />
      </div>
      <div v-for="f in businessFields" :key="f.key">
        <label class="label" :for="`s-${f.key}`">{{ f.label }}</label>
        <input :id="`s-${f.key}`" v-model="form[f.key]" class="input" :disabled="!isAdmin" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="saved" class="text-sm text-green-700">Guardado. Se verá en los catálogos al publicar o recargar.</p>
      <button v-if="isAdmin" class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
    </form>

    <section class="card space-y-3">
      <h2 class="text-xl font-semibold">Colores de tu marca</h2>
      <p class="text-sm text-neutral-600">
        Define aquí los colores y las fuentes de tu negocio. En cada catálogo podrás elegir
        «Colores de mi negocio» en el selector de tema, y si los cambias aquí se actualizan todos esos catálogos,
        también los ya publicados.
      </p>
      <p v-if="!isAdmin" class="text-sm text-neutral-500">Solo un administrador puede editarlos.</p>

      <div class="flex flex-wrap items-start gap-4">
        <div class="space-y-3">
          <ThemeEditor :model-value="brandDraft ?? 'joyeria'" :disabled="!isAdmin" @update:model-value="onBrandChange" />
          <p v-if="!brandDraft" class="text-xs text-neutral-500">Aún no definiste colores de marca. Elige uno y personalízalo.</p>
          <div v-if="isAdmin" class="flex gap-2">
            <button type="button" class="btn btn-primary" :disabled="savingBrand || !brandDraft" @click="saveBrand(brandDraft)">
              {{ savingBrand ? 'Guardando…' : 'Guardar colores de marca' }}
            </button>
            <button
              v-if="organization?.brand_theme"
              type="button"
              class="btn btn-danger"
              :disabled="savingBrand"
              @click="saveBrand(null)"
            >
              Quitar
            </button>
          </div>
          <p v-if="brandError" class="text-sm text-red-600">{{ brandError }}</p>
          <p v-if="brandSaved" class="text-sm text-green-700">Guardado.</p>
        </div>
        <div class="flex gap-2">
          <PageThumb v-for="i in [0, 1]" :key="i" :page="previewPage" :data="sampleCatalog" :index="i" :width="110" />
        </div>
      </div>
    </section>
  </div>
</template>