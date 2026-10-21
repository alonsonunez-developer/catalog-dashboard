<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatShortcut, visibleItems, type Menu, type MenuItem } from '../lib/menu'

defineProps<{ menus: Menu[] }>()

const open = ref(-1)
const root = ref<HTMLElement | null>(null)
const mac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

function enabledItems(): HTMLButtonElement[] {
  return Array.from(root.value?.querySelectorAll<HTMLButtonElement>('[data-panel] [role^="menuitem"]:not([disabled])') ?? [])
}
function topButton(i: number) {
  return root.value?.querySelector<HTMLButtonElement>(`[data-top="${i}"]`)
}

async function openAt(i: number, focusFirst = false) {
  open.value = i
  if (focusFirst) {
    await nextTick()
    enabledItems()[0]?.focus()
  }
}
function close(focusTop = false) {
  const i = open.value
  open.value = -1
  if (focusTop && i >= 0) topButton(i)?.focus()
}
function toggle(i: number) {
  if (open.value === i) close()
  else openAt(i)
}
// Con un menú abierto, pasar el cursor por otro encabezado lo abre
function hover(i: number) {
  if (open.value >= 0 && open.value !== i) open.value = i
}

function run(item: MenuItem, ev: Event) {
  if (item.disabled || item.separator) return
  ;(ev.currentTarget as HTMLElement | null)?.blur()
  close()
  item.action?.()
}

function onKeydown(e: KeyboardEvent) {
  if (open.value < 0) return
  const total = root.value?.querySelectorAll('[data-top]').length ?? 0
  if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault()
    openAt((open.value + (e.key === 'ArrowRight' ? 1 : -1) + total) % total, true)
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const items = enabledItems()
    if (!items.length) return
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i <= 0 ? items.length : i) - 1
    items[next].focus()
  }
}

function onPointerDown(e: PointerEvent) {
  if (open.value >= 0 && root.value && !root.value.contains(e.target as Node)) close()
}
onMounted(() => document.addEventListener('pointerdown', onPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown))
</script>

<template>
  <div ref="root" class="flex items-center gap-0.5" role="menubar" @keydown="onKeydown">
    <div v-for="(m, i) in menus" :key="m.label" class="relative">
      <button
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        :aria-expanded="open === i"
        :data-top="i"
        class="cursor-pointer rounded px-3 py-1.5 text-sm hover:bg-neutral-100"
        :class="open === i ? 'bg-neutral-200' : ''"
        @click="toggle(i)"
        @mouseenter="hover(i)"
        @keydown.down.prevent="openAt(i, true)"
      >
        {{ m.label }}
      </button>

      <div
        v-if="open === i"
        data-panel
        role="menu"
        :aria-label="m.label"
        class="absolute left-0 top-full z-30 mt-1 min-w-64 rounded-md border border-neutral-200 bg-white py-1 shadow-lg"
      >
        <template v-for="(it, k) in visibleItems(m.items)" :key="k">
          <hr v-if="it.separator" role="separator" class="my-1 border-neutral-200" />
          <button
            v-else
            type="button"
            :role="it.checked !== undefined ? 'menuitemcheckbox' : 'menuitem'"
            :aria-checked="it.checked !== undefined ? it.checked : undefined"
            :disabled="it.disabled"
            class="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent"
            @click="run(it, $event)"
          >
            <span class="w-4 shrink-0 text-xs" aria-hidden="true">{{ it.checked ? '✓' : '' }}</span>
            <span class="flex-1">{{ it.label }}</span>
            <span v-if="it.shortcut" class="ml-4 text-xs text-neutral-400">{{ formatShortcut(it.shortcut, mac) }}</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>