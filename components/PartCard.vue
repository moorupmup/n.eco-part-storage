<template>
  <div class="relative bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 shadow-sm transition-colors duration-150 hover:border-zinc-700">
    <!-- Top row: Code + Category + Dropdown menu -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          class="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700/80 active:scale-95 text-primary-400 border border-zinc-700/60 hover:border-emerald-500/40 transition-all cursor-pointer"
          title="Нажмите, чтобы скопировать артикул"
          @click.stop="part?.code && copyToClipboard(part.code, 'Артикул')"
        >
          <UIcon name="i-lucide-barcode" class="w-3.5 h-3.5" />
          <span>{{ part?.code }}</span>
        </button>
        <span v-if="part.category" class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
          {{ part.category }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Out of stock indicator pill -->
        <span
          v-if="isOut"
          class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Нет
        </span>

        <!-- More options menu -->
        <UDropdown :items="menuItems" :popper="{ placement: 'bottom-end' }">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-more-vertical"
            size="xs"
            class="text-zinc-400 hover:text-zinc-200"
          />
        </UDropdown>
      </div>
    </div>

    <!-- Part Name -->
    <h3
      class="text-sm font-semibold text-zinc-100 leading-snug mb-2 hover:text-emerald-300 active:opacity-75 transition-colors cursor-pointer"
      title="Нажмите, чтобы скопировать наименование"
      @click.stop="copyToClipboard(part.name, 'Название')"
    >
      {{ part.name }}
    </h3>

    <!-- Tags list (clean inline text with commas) -->
    <div v-if="displayTags.length > 0" class="flex items-center flex-wrap gap-y-0.5 mb-2.5 text-xs leading-normal">
      <template v-for="(tag, idx) in displayTags" :key="tag">
        <button
          type="button"
          class="inline-flex items-center text-zinc-500 hover:text-emerald-400 active:opacity-75 transition-colors cursor-pointer"
          :title="`Фильтровать по #${tag}`"
          @click.stop="filterByTag(tag)"
        >
          <span class="text-emerald-500/70 mr-0.5">#</span><span>{{ tag }}</span>
        </button><span v-if="idx < displayTags.length - 1" class="text-zinc-600 mr-1.5">,</span>
      </template>
    </div>

    <!-- Stock counters (New vs Used) -->
    <div class="grid grid-cols-2 gap-2 mb-3">
      <!-- NEW PARTS -->
      <div class="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-blue-500" />
          <span class="text-xs text-zinc-300 font-medium">Новые:</span>
        </div>
        <span class="text-sm font-bold text-blue-400 font-mono">
          {{ part.stock_new }} <span class="text-[10px] font-normal text-zinc-500">шт</span>
        </span>
      </div>

      <!-- USED PARTS -->
      <div class="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-500" />
          <span class="text-xs text-zinc-300 font-medium">Б/У:</span>
        </div>
        <span class="text-sm font-bold text-amber-400 font-mono">
          {{ part.stock_used }} <span class="text-[10px] font-normal text-zinc-500">шт</span>
        </span>
      </div>
    </div>

    <!-- Quick action buttons: Left = Списание (neutral gray), Right = Приход (emerald) -->
    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        :disabled="part.stock_new === 0 && part.stock_used === 0"
        class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 active:scale-[0.98] border border-zinc-700/80 text-zinc-300 hover:text-zinc-100 text-xs font-semibold shadow-sm transition-all disabled:opacity-30 disabled:pointer-events-none"
        @click="$emit('action', { part, type: 'OUT' })"
      >
        <UIcon name="i-lucide-minus" class="w-4 h-4 stroke-[2.5] text-zinc-400" />
        <span>Списание</span>
      </button>

      <button
        type="button"
        class="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 active:scale-[0.98] border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm transition-all"
        @click="$emit('action', { part, type: 'IN' })"
      >
        <UIcon name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
        <span>Приход</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Part, MovementType } from '~/types'
import { parseTags } from '~/utils/tags'
import { usePartsStore } from '~/stores/parts'

const props = defineProps<{
  part: Part
}>()

const partsStore = usePartsStore()
const { copyToClipboard } = useClipboardCopy()

const displayTags = computed(() => {
  if (props.part?.tags && props.part.tags.length > 0) {
    return props.part.tags
  }
  return parseTags(props.part?.notes)
})

function filterByTag(tag: string) {
  partsStore.searchQuery = tag
}

const emit = defineEmits<{
  (e: 'action', payload: { part: Part; type: MovementType }): void
  (e: 'edit', part: Part): void
  (e: 'delete', part: Part): void
}>()

const totalStock = computed(() => (props.part?.stock_new || 0) + (props.part?.stock_used || 0))
const isOut = computed(() => totalStock.value === 0)

const menuItems = computed(() => [
  [
    {
      label: 'Редактировать',
      icon: 'i-lucide-pencil',
      click: () => emit('edit', props.part)
    },
    {
      label: 'Удалить',
      icon: 'i-lucide-trash-2',
      click: () => emit('delete', props.part)
    }
  ]
])
</script>
