<template>
  <div class="space-y-2">
    <!-- Header with Toggle Button -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span class="text-xs font-bold tracking-wide uppercase text-zinc-400">
          Сводка склада
        </span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 active:scale-95 transition-all cursor-pointer"
        :title="isCollapsed ? 'Развернуть виджеты' : 'Свернуть виджеты'"
        @click="toggleCollapse"
      >
        <span>{{ isCollapsed ? 'Показать виджеты' : 'Свернуть' }}</span>
        <UIcon
          :name="isCollapsed ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
          class="w-3.5 h-3.5 transition-transform"
        />
      </button>
    </div>

    <!-- Collapsed Compact Strip -->
    <div
      v-if="isCollapsed"
      class="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-sm cursor-pointer hover:border-zinc-700/80 transition-all text-xs"
      @click="toggleCollapse"
    >
      <div class="flex items-center gap-3 overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-1.5 text-zinc-300 whitespace-nowrap">
          <UIcon name="i-lucide-boxes" class="w-3.5 h-3.5 text-emerald-400" />
          <span>{{ stats.totalPositions }} поз. ({{ totalUnits }} шт)</span>
        </div>
        <span class="text-zinc-600">·</span>
        <div class="flex items-center gap-1.5 whitespace-nowrap" :class="stats.lowStockPositions > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-400'">
          <UIcon :name="stats.lowStockPositions > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'" class="w-3.5 h-3.5" />
          <span>{{ stats.lowStockPositions > 0 ? `Дефицит: ${stats.lowStockPositions}` : 'Дефицита нет' }}</span>
        </div>
        <span class="text-zinc-600">·</span>
        <div class="flex items-center gap-1.5 text-zinc-300 whitespace-nowrap">
          <UIcon name="i-lucide-wallet" class="w-3.5 h-3.5 text-blue-400" />
          <span class="font-mono">{{ formatMoney(stats.totalValuation) }} ₽</span>
        </div>
      </div>

      <UIcon name="i-lucide-maximize-2" class="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-2" />
    </div>

    <!-- Expanded 4-Grid Cards -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
    >
      <!-- WIDGET 1: Наличие деталей на складе -->
      <div
        class="relative overflow-hidden p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
        @click="$emit('filter-stock', 'all')"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Остаток на складе
          </span>
          <div class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <UIcon name="i-lucide-boxes" class="w-4 h-4" />
          </div>
        </div>

        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-2xl font-black text-zinc-100 font-mono tracking-tight">
            {{ totalUnits }}
          </span>
          <span class="text-xs text-zinc-500">шт всего</span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px]">
          <div class="flex items-center gap-1.5 text-blue-400">
            <span class="w-2 h-2 rounded-full bg-blue-500" />
            <span>Новые: <strong>{{ stats.totalNewQuantity }}</strong></span>
          </div>
          <div class="flex items-center gap-1.5 text-amber-400">
            <span class="w-2 h-2 rounded-full bg-amber-500" />
            <span>Б/У: <strong>{{ stats.totalUsedQuantity }}</strong></span>
          </div>
        </div>
      </div>

      <!-- WIDGET 2: Дефицит / Пополнение -->
      <div
        class="relative overflow-hidden p-3.5 rounded-2xl border shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
        :class="stats.lowStockPositions > 0
          ? 'bg-amber-950/20 border-amber-800/50 hover:border-amber-700/80'
          : 'bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700'"
        @click="$emit('filter-stock', 'low')"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span
            class="text-[11px] font-semibold uppercase tracking-wider"
            :class="stats.lowStockPositions > 0 ? 'text-amber-400' : 'text-zinc-400'"
          >
            Контроль запаса
          </span>
          <div
            class="w-7 h-7 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105"
            :class="stats.lowStockPositions > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'"
          >
            <UIcon :name="stats.lowStockPositions > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'" class="w-4 h-4" />
          </div>
        </div>

        <template v-if="stats.lowStockPositions > 0">
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {{ stats.lowStockPositions }}
            </span>
            <span class="text-xs text-amber-300/80">поз. в дефиците</span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-amber-900/40 text-[11px] text-amber-300/90">
            <span>Ниже минимального</span>
            <span class="font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Открыть список <UIcon name="i-lucide-arrow-right" class="w-3 h-3" />
            </span>
          </div>
        </template>

        <template v-else>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-lg font-bold text-emerald-400 tracking-tight">
              Запас в норме
            </span>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
            <span>Минимум обеспечен</span>
            <span class="text-emerald-500 font-medium">100% готовность</span>
          </div>
        </template>
      </div>

      <!-- WIDGET 3: Финансовая оценка склада -->
      <div
        class="relative overflow-hidden p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 hover:border-zinc-700 shadow-sm transition-all group"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Оценка запасов
          </span>
          <div class="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <UIcon name="i-lucide-wallet" class="w-4 h-4" />
          </div>
        </div>

        <div class="flex items-baseline gap-1.5 mb-2">
          <span class="text-2xl font-black text-zinc-100 font-mono tracking-tight">
            {{ formatMoney(stats.totalValuation) }}
          </span>
          <span class="text-xs text-zinc-500 font-semibold">₽</span>
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px]">
          <div class="flex items-center gap-1 text-zinc-400">
            <span>Новые:</span>
            <strong class="text-zinc-200 font-mono">{{ formatMoney(stats.newValuation) }} ₽</strong>
          </div>
          <div class="flex items-center gap-1 text-zinc-400">
            <span>Б/У:</span>
            <strong class="text-zinc-200 font-mono">{{ formatMoney(stats.usedValuation) }} ₽</strong>
          </div>
        </div>
      </div>

      <!-- WIDGET 4: Быстрые действия / Пульс -->
      <div
        class="relative overflow-hidden p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 shadow-sm flex flex-col justify-between"
      >
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Быстрый доступ
          </span>
          <div class="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UIcon name="i-lucide-zap" class="w-4 h-4" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-sm cursor-pointer"
            @click="$emit('open-add-part')"
          >
            <UIcon name="i-lucide-plus-circle" class="w-3.5 h-3.5" />
            <span>Деталь</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 font-medium text-xs transition-all border border-zinc-700/60 cursor-pointer"
            @click="$emit('open-stock-action')"
          >
            <UIcon name="i-lucide-arrow-left-right" class="w-3.5 h-3.5 text-emerald-400" />
            <span>Приход/Расход</span>
          </button>
        </div>

        <div class="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/60 text-[11px]">
          <NuxtLink
            to="/history"
            class="inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <UIcon name="i-lucide-history" class="w-3 h-3" />
            <span>История</span>
          </NuxtLink>

          <NuxtLink
            to="/backup"
            class="inline-flex items-center gap-1 text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <UIcon name="i-lucide-file-spreadsheet" class="w-3 h-3" />
            <span>Отчет Excel</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePartsStore } from '~/stores/parts'
import { useHaptics } from '~/composables/useHaptics'

defineEmits<{
  (e: 'filter-stock', filter: 'all' | 'low' | 'out' | 'in_stock'): void
  (e: 'open-add-part'): void
  (e: 'open-stock-action'): void
}>()

const partsStore = usePartsStore()
const haptics = useHaptics()
const stats = computed(() => partsStore.stats)

const totalUnits = computed(() => {
  return (stats.value.totalNewQuantity || 0) + (stats.value.totalUsedQuantity || 0)
})

const isCollapsed = ref(false)

onMounted(() => {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('neco_dashboard_widgets_collapsed')
    if (saved !== null) {
      isCollapsed.value = saved === 'true'
    }
  }
})

function toggleCollapse() {
  haptics.lightTap()
  isCollapsed.value = !isCollapsed.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('neco_dashboard_widgets_collapsed', String(isCollapsed.value))
  }
}

function formatMoney(amount: number): string {
  if (!amount || isNaN(amount)) return '0'
  return Math.round(amount).toLocaleString('ru-RU')
}
</script>
