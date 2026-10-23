<template>
  <div class="space-y-2">
    <!-- Compact Informative Strip + Quick Actions Bar -->
    <div class="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-2.5">
      <!-- 1. Compact Informative Metrics Row (Запас, Дефицит, Оценка равной ширины на всю ширину) -->
      <div class="grid grid-cols-3 gap-2 w-full text-xs">
        <!-- Stock count pill -->
        <button
          type="button"
          class="h-12 flex items-center gap-2 px-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 active:scale-95 transition-all text-left w-full min-w-0 cursor-pointer shadow-sm"
          title="Нажмите, чтобы сбросить фильтры"
          @click="$emit('filter-stock', 'all')"
        >
          <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <UIcon name="i-lucide-boxes" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1 truncate">
            <div class="flex items-baseline gap-1">
              <span class="font-mono font-bold text-zinc-100 text-sm leading-none">{{ totalUnits }}</span>
              <span class="text-[10px] text-zinc-500">шт</span>
            </div>
            <div class="text-[10px] text-zinc-400 flex items-center gap-1 font-mono truncate">
              <span class="text-blue-400">нов: {{ stats.totalNewQuantity }}</span>
              <span class="text-zinc-600">·</span>
              <span class="text-amber-400">б/у: {{ stats.totalUsedQuantity }}</span>
            </div>
          </div>
        </button>

        <!-- Deficit status pill -->
        <button
          type="button"
          class="h-12 flex items-center gap-2 px-2.5 rounded-xl border active:scale-95 transition-all text-left w-full min-w-0 cursor-pointer shadow-sm"
          :class="stats.lowStockPositions > 0
            ? 'bg-amber-950/25 border-amber-800/60 hover:border-amber-600/80 text-amber-300'
            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'"
          title="Нажмите, чтобы открыть позиции в дефиците"
          @click="$emit('filter-stock', 'low')"
        >
          <div
            class="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
            :class="stats.lowStockPositions > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'"
          >
            <UIcon :name="stats.lowStockPositions > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1 truncate">
            <div class="flex items-baseline gap-1">
              <span class="font-mono font-bold text-sm leading-none" :class="stats.lowStockPositions > 0 ? 'text-amber-400' : 'text-emerald-400'">
                {{ stats.lowStockPositions > 0 ? stats.lowStockPositions : 'Норма' }}
              </span>
              <span class="text-[10px]" :class="stats.lowStockPositions > 0 ? 'text-amber-400/80' : 'text-zinc-500'">
                {{ stats.lowStockPositions > 0 ? 'дефицит' : '' }}
              </span>
            </div>
            <div class="text-[10px] truncate" :class="stats.lowStockPositions > 0 ? 'text-amber-400/90 font-medium' : 'text-zinc-500'">
              {{ stats.lowStockPositions > 0 ? 'Требуют заказа →' : 'Запас обеспечен' }}
            </div>
          </div>
        </button>

        <!-- Valuation pill -->
        <div
          class="h-12 flex items-center gap-2 px-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-left w-full min-w-0 shadow-sm"
        >
          <div class="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <UIcon name="i-lucide-wallet" class="w-3.5 h-3.5" />
          </div>
          <div class="min-w-0 flex-1 truncate">
            <div class="font-mono font-bold text-zinc-200 text-xs leading-none truncate">
              {{ formatMoney(stats.totalValuation) }} ₽
            </div>
            <div class="text-[10px] text-zinc-500 truncate">
              Оценка склада
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Quick Access Buttons Row (Деталь / Приход и Расход) -->
      <div class="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 w-full">
        <!-- Add Part Button -->
        <button
          type="button"
          class="h-10 w-full flex items-center justify-center gap-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-sm cursor-pointer min-w-0 whitespace-nowrap"
          @click="$emit('open-add-part')"
        >
          <UIcon name="i-lucide-plus-circle" class="w-4 h-4 stroke-[2.5] shrink-0" />
          <span>Деталь</span>
        </button>

        <!-- Quick Stock Movement Button (Приход / Расход по любому артикулу) -->
        <button
          type="button"
          class="h-10 w-full flex items-center justify-center gap-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-100 font-bold text-xs transition-all border border-zinc-700/70 shadow-sm cursor-pointer min-w-0 whitespace-nowrap"
          @click="$emit('open-quick-stock')"
        >
          <UIcon name="i-lucide-arrow-left-right" class="w-4 h-4 text-emerald-400 stroke-[2.5] shrink-0" />
          <span>Приход / Расход</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePartsStore } from '~/stores/parts'

defineEmits<{
  (e: 'filter-stock', filter: 'all' | 'low' | 'out' | 'in_stock'): void
  (e: 'open-add-part'): void
  (e: 'open-quick-stock'): void
}>()

const partsStore = usePartsStore()
const stats = computed(() => partsStore.stats)

const totalUnits = computed(() => {
  return (stats.value.totalNewQuantity || 0) + (stats.value.totalUsedQuantity || 0)
})

function formatMoney(amount: number): string {
  if (!amount || isNaN(amount)) return '0'
  return Math.round(amount).toLocaleString('ru-RU')
}
</script>
