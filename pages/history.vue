<template>
  <div>
    <!-- Top Header -->
    <AppHeader
      title="История движений"
      :subtitle="`${transStore.filteredTransactions.length} операций в логе`"
    >
      <template #actions>
        <button
          type="button"
          :disabled="transStore.filteredTransactions.length === 0"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 active:scale-95 transition-all disabled:opacity-40"
          title="Экспорт в Excel"
          @click="exportHistory"
        >
          <UIcon name="i-lucide-download" class="w-4 h-4" />
        </button>

        <button
          type="button"
          class="flex items-center justify-center w-9 h-9 rounded-xl border active:scale-95 transition-all"
          :class="isFilterActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-zinc-100'"
          title="Фильтр"
          @click="isFilterDrawerOpen = !isFilterDrawerOpen"
        >
          <UIcon name="i-lucide-filter" class="w-4 h-4" />
        </button>
      </template>
    </AppHeader>

    <div class="px-4 py-3 space-y-3">
      <!-- Quick Type Filter Buttons -->
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="py-2 text-xs font-semibold rounded-xl border transition-all text-center"
          :class="transStore.selectedType === 'ALL' ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
          @click="setType('ALL')"
        >
          Все операции
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl border transition-all"
          :class="transStore.selectedType === 'IN' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
          @click="setType('IN')"
        >
          <UIcon name="i-lucide-plus" class="w-3.5 h-3.5 text-emerald-400" />
          Приход
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded-xl border transition-all"
          :class="transStore.selectedType === 'OUT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-400'"
          @click="setType('OUT')"
        >
          <UIcon name="i-lucide-minus" class="w-3.5 h-3.5 text-rose-400" />
          Списание
        </button>
      </div>

      <!-- Active filters bar if set -->
      <div v-if="isFilterActive" class="flex items-center justify-between p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
        <div class="flex items-center gap-1.5 text-zinc-300 flex-wrap">
          <span class="text-zinc-500">Фильтры:</span>
          <span v-if="selectedPartName" class="px-1.5 py-0.5 rounded bg-zinc-800 text-primary-300">
            {{ selectedPartName }}
          </span>
          <span v-if="transStore.dateFrom || transStore.dateTo" class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {{ transStore.dateFrom || '...' }} — {{ transStore.dateTo || '...' }}
          </span>
        </div>
        <button
          type="button"
          class="text-xs text-rose-400 hover:text-rose-300 font-medium ml-2"
          @click="clearAllFilters"
        >
          Сброс
        </button>
      </div>

      <!-- Transactions List -->
      <div v-if="transStore.filteredTransactions.length > 0" class="space-y-2.5">
        <div
          v-for="item in transStore.filteredTransactions"
          :key="item.id"
          class="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-sm"
        >
          <!-- Top row: Type indicator + Condition pill + Date -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono"
                :class="item.type === 'IN' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'"
              >
                <UIcon :name="item.type === 'IN' ? 'i-lucide-arrow-up-right' : 'i-lucide-arrow-down-left'" class="w-3.5 h-3.5" />
                {{ item.type === 'IN' ? '+' : '-' }}{{ item.quantity }} шт
              </span>

              <span
                class="text-[11px] px-2 py-0.5 rounded-full font-medium"
                :class="item.condition === 'NEW' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'"
              >
                {{ item.condition === 'NEW' ? 'Новая' : 'Б/У' }}
              </span>
            </div>

            <span class="text-[11px] text-zinc-400 font-mono">
              {{ formatDate(item.created_at) }}
            </span>
          </div>

          <!-- Part info -->
          <div>
            <div class="flex items-center gap-1.5 mb-0.5">
              <span class="font-mono text-xs text-primary-400 font-semibold">
                {{ item.part_code }}
              </span>
              <span class="text-xs font-medium text-zinc-200 line-clamp-1">
                {{ item.part_name }}
              </span>
            </div>
          </div>

          <!-- Reason & Stock balance -->
          <div class="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/80">
            <span class="text-zinc-300 italic line-clamp-1 pr-2">
              {{ item.reason || 'Без комментария' }}
            </span>
            <span class="text-[11px] font-mono text-zinc-500 shrink-0">
              Остаток: {{ item.stock_before }} → <strong class="text-zinc-300">{{ item.stock_after }}</strong>
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl mt-4"
      >
        <div class="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-500 flex items-center justify-center mb-3">
          <UIcon name="i-lucide-history" class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-zinc-200 mb-1">
          История пуста
        </h3>
        <p class="text-xs text-zinc-400 max-w-xs">
          Операций с выбранными параметрами фильтрации не найдено.
        </p>
      </div>
    </div>

    <!-- Filter Modal / Bottom Sheet -->
    <UModal v-model="isFilterDrawerOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 class="text-base font-bold text-zinc-100 flex items-center gap-2">
            <UIcon name="i-lucide-filter" class="w-4 h-4 text-primary-400" />
            Фильтр истории
          </h3>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-x"
            size="sm"
            @click="isFilterDrawerOpen = false"
          />
        </div>

        <!-- Filter by Part -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
            Конкретная деталь
          </label>
          <select
            v-model="tempPartId"
            class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-primary-500"
          >
            <option :value="null">Все детали</option>
            <option v-for="p in partsStore.parts" :key="p.id" :value="p.id">
              [{{ p.code }}] {{ p.name }}
            </option>
          </select>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
              С даты
            </label>
            <input
              v-model="tempDateFrom"
              type="date"
              class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
              По дату
            </label>
            <input
              v-model="tempDateTo"
              type="date"
              class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
            />
          </div>
        </div>

        <!-- Preset date ranges -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            @click="setDatePreset('today')"
          >
            Сегодня
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            @click="setDatePreset('7days')"
          >
            За 7 дней
          </button>
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            @click="setDatePreset('month')"
          >
            Этот месяц
          </button>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Сбросить"
            block
            class="flex-1"
            @click="resetFilterForm"
          />
          <UButton
            color="primary"
            variant="solid"
            label="Применить"
            block
            class="flex-1 font-bold"
            @click="applyFilterForm"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { MovementType } from '~/types'
import { useTransactionsStore } from '~/stores/transactions'
import { usePartsStore } from '~/stores/parts'
import { exportTransactionsToExcel } from '~/utils/exportImport'

const transStore = useTransactionsStore()
const partsStore = usePartsStore()
const toast = useToast()

const isFilterDrawerOpen = ref(false)
const tempPartId = ref<number | null>(null)
const tempDateFrom = ref('')
const tempDateTo = ref('')

onMounted(async () => {
  await transStore.fetchTransactions()
})

const isFilterActive = computed(() => {
  return transStore.selectedPartId !== null || transStore.dateFrom !== '' || transStore.dateTo !== ''
})

const selectedPartName = computed(() => {
  if (!transStore.selectedPartId) return ''
  const p = partsStore.parts.find(item => item.id === transStore.selectedPartId)
  return p ? p.code : ''
})

function setType(type: MovementType | 'ALL') {
  transStore.setTypeFilter(type)
  transStore.fetchTransactions()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function setDatePreset(preset: 'today' | '7days' | 'month') {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  if (preset === 'today') {
    tempDateFrom.value = todayStr
    tempDateTo.value = todayStr
  } else if (preset === '7days') {
    const past = new Date()
    past.setDate(past.getDate() - 7)
    tempDateFrom.value = past.toISOString().slice(0, 10)
    tempDateTo.value = todayStr
  } else if (preset === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    tempDateFrom.value = firstDay.toISOString().slice(0, 10)
    tempDateTo.value = todayStr
  }
}

function resetFilterForm() {
  tempPartId.value = null
  tempDateFrom.value = ''
  tempDateTo.value = ''
  transStore.resetFilters()
  isFilterDrawerOpen.value = false
}

function applyFilterForm() {
  transStore.setPartFilter(tempPartId.value)
  transStore.setDateRange(tempDateFrom.value, tempDateTo.value)
  transStore.fetchTransactions()
  isFilterDrawerOpen.value = false
}

function clearAllFilters() {
  transStore.resetFilters()
  tempPartId.value = null
  tempDateFrom.value = ''
  tempDateTo.value = ''
}

function exportHistory() {
  exportTransactionsToExcel(transStore.filteredTransactions)
  toast.add({
    title: 'Экспорт завершен',
    description: 'Файл Excel с историей сохранен',
    color: 'emerald'
  })
}
</script>
