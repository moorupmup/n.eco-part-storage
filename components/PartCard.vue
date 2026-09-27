<template>
  <div class="relative bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 shadow-sm transition-all duration-150 hover:border-zinc-700">
    <!-- Top row: Code + Category + Dropdown menu -->
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-primary-400 border border-zinc-700/60">
          <UIcon name="i-lucide-barcode" class="w-3.5 h-3.5" />
          {{ part.code }}
        </span>
        <span v-if="part.category" class="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
          {{ part.category }}
        </span>
      </div>

      <div class="flex items-center gap-1">
        <!-- Low stock indicator pill -->
        <span
          v-if="isOut"
          class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          Нет
        </span>
        <span
          v-else-if="isLow"
          class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Мало
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
    <h3 class="text-sm font-semibold text-zinc-100 leading-snug mb-2">
      {{ part.name }}
    </h3>

    <!-- Min stock & notes if any -->
    <div v-if="part.min_stock > 0 || part.notes" class="flex items-center gap-3 text-xs text-zinc-400 mb-3 flex-wrap">
      <span v-if="part.min_stock > 0" class="inline-flex items-center gap-1 text-zinc-500">
        Минимум с собой: {{ part.min_stock }} шт
      </span>
      <span v-if="part.notes" class="inline-flex items-center gap-1 text-zinc-500 truncate max-w-[260px]">
        {{ part.notes }}
      </span>
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

const props = defineProps<{
  part: Part
}>()

const emit = defineEmits<{
  (e: 'action', payload: { part: Part; type: MovementType }): void
  (e: 'edit', part: Part): void
  (e: 'delete', part: Part): void
}>()

const totalStock = computed(() => props.part.stock_new + props.part.stock_used)
const isOut = computed(() => totalStock.value === 0)
const isLow = computed(() => props.part.min_stock > 0 && totalStock.value <= props.part.min_stock && totalStock.value > 0)

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
