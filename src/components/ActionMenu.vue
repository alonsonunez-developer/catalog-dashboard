<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { visibleItems, type MenuItem } from '../lib/menu'

const props = withDefaults(defineProps<{ items: MenuItem[]; label?: string }>(), { label: '...' })

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const pos = ref({ top: 0, left: 0 })

const PANEL_W = 224

function place() {
  const t = trigger.value?.getBoundingClientRect()
  if (!t) return
  const h = panel.value?.offsetHeight ?? 0
  const below = t.bottom + 4
  // Si no cabe debajo, se abre hacia arriba
  const top = below + h > window.innerHeight - 8 && t.top - 4 - h > 8 ? t.top - 4 - h : below
  const left = Math.max(8, Math.min(t.right - PANEL_W, window.innerWidth - PANEL_W - 8))
  pos.value = { top, left }
}

async function show() {
  open.value = true
  place()
  await nextTick()
  place() // ahora ya se conoce la altura real del panel
  focusables()[0]?.focus()
}
function hide(focusTrigger = false) {
  open.value = false
  if (focusTrigger) trigger.value?.focus()
}
function toggle() {
  if (open.value) hide()
  else show()
}

const focusables = () => Array.from(panel.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])

function run(item: MenuItem) {
  if (item.disabled) return
  hide()
  item.action?.()
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    hide(true)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const list = focusables()
    if (!list.length) return
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    list[e.key === 'ArrowDown' ? (i + 1) % list.length : (i <= 0 ? list.length : i) - 1].focus()
  } else if (e.key === 'Tab') {
    hide()
  }
}

function onPointerDown(e: PointerEvent) {
  const n = e.target as Node
  if (open.value && !trigger.value?.contains(n) && !panel.value?.contains(n)) hide()
}
const onViewport = () => open.value && place()

document.addEventListener('pointerdown', onPointerDown)
window.addEventListener('resize', onViewport)
window.addEventListener('scroll', onViewport, true)
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('resize', onViewport)
  window.removeEventListener('scroll', onViewport, true)
})
</script>

<template>
  <div @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      class="btn btn-secondary !px-2.5 !py-1.5 text-sm"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      {{ props.label }} <span aria-hidden="true" class="ml-1 text-xs">▾</span>
    </button>

    <!-- Se dibuja en el <body> para que la tabla (overflow) no lo recorte -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        role="menu"
        :aria-label="props.label"
        class="fixed z-50 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px` }"
        @keydown="onKeydown"
      >
        <template v-for="(it, k) in visibleItems(items)" :key="k">
          <hr v-if="it.separator" role="separator" class="my-1 border-neutral-200" />
          <button
            v-else
            type="button"
            role="menuitem"
            :disabled="it.disabled"
            class="flex w-full cursor-pointer items-center px-3 py-1.5 text-left text-sm hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent"
            :class="it.danger ? 'text-red-700' : ''"
            @click="run(it)"
          >
            {{ it.label }}
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>