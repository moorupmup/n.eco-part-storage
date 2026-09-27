<template>
  <div>
    <!-- Top Header -->
    <AppHeader
      title="Потребность и заказ"
      :subtitle="`${partsStore.lowStockParts.length} позиций ниже минимального остатка`"
    >
      <template #actions>
        <button
          type="button"
          :disabled="partsStore.lowStockParts.length === 0"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 active:scale-95 transition-all disabled:opacity-40"
          title="Поделиться"
          @click="shareRequisition"
        >
          <UIcon name="i-lucide-share-2" class="w-4 h-4" />
        </button>

        <button
          type="button"
          :disabled="partsStore.lowStockParts.length === 0"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all disabled:opacity-40"
          title="Скачать Excel"
          @click="downloadRequisitionExcel"
        >
          <UIcon name="i-lucide-download" class="w-4 h-4" />
        </button>
      </template>
    </AppHeader>

    <div class="px-4 py-3 space-y-3">
      <!-- Shortage Summary Card -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <UIcon name="i-lucide-alert-circle" class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-xs font-bold text-amber-300">Дефицит запчастей</h2>
              <p class="text-[11px] text-zinc-400">Позиции, требующие закупки или выдачи</p>
            </div>
          </div>
          <span class="text-lg font-bold text-amber-400 font-mono">
            {{ totalDeficitUnits }} <span class="text-xs font-normal text-zinc-400">шт</span>
          </span>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-amber-500/15">
          <UButton
            color="amber"
            variant="solid"
            size="xs"
            icon="i-lucide-copy"
            label="Скопировать для заявки"
            class="font-semibold"
            @click="copyRequisitionText"
          />
        </div>
      </div>

      <!-- List of Low-Stock Items -->
      <div v-if="partsStore.lowStockParts.length > 0" class="space-y-2.5">
        <div
          v-for="item in partsStore.lowStockParts"
          :key="item.id"
          class="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-primary-400 border border-zinc-700/60 mb-1">
                {{ item.code }}
              </span>
              <h3 class="text-sm font-bold text-zinc-100">
                {{ item.name }}
              </h3>
              <p v-if="item.location" class="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="w-3.5 h-3.5 text-zinc-500" />
                {{ item.location }}
              </p>
            </div>

            <!-- Shortage Badge -->
            <div class="text-right">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono">
                +{{ item.deficit }} шт
              </span>
              <div class="text-[10px] text-zinc-500 mt-0.5">дефицит</div>
            </div>
          </div>

          <!-- Stock detail breakdown -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-zinc-950/70 text-xs">
            <span class="text-zinc-400">
              Текущий: <strong class="text-zinc-200 font-mono">{{ item.totalStock }}</strong> шт
              <span class="text-[10px] text-zinc-500">(нов: {{ item.stock_new }}, б/у: {{ item.stock_used }})</span>
            </span>
            <span class="text-zinc-400">
              Мин: <strong class="text-amber-400 font-mono">{{ item.min_stock }}</strong> шт
            </span>
          </div>

          <!-- Quick Actions -->
          <div class="pt-1">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 active:scale-[0.98] border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-sm transition-all"
              @click="openStockModal(item)"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
              <span>Оформить приход</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state when all parts have healthy stock -->
      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl mt-4"
      >
        <div class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
          <UIcon name="i-lucide-check-circle" class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-zinc-200 mb-1">
          Все позиции в норме
        </h3>
        <p class="text-xs text-zinc-400 max-w-xs">
          Ни одна запчасть не опустилась ниже минимального остатка.
        </p>
      </div>
    </div>

    <!-- Stock Modal -->
    <StockActionModal
      v-model="isStockModalOpen"
      :part="selectedPart"
      initial-type="IN"
      @success="handleSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import * as XLSX from 'xlsx'
import type { Part } from '~/types'
import { usePartsStore } from '~/stores/parts'

const partsStore = usePartsStore()
const toast = useToast()

const selectedPart = ref<Part | null>(null)
const isStockModalOpen = ref(false)

const totalDeficitUnits = computed(() => {
  return partsStore.lowStockParts.reduce((acc, curr) => acc + curr.deficit, 0)
})

function openStockModal(item: Part) {
  selectedPart.value = item
  isStockModalOpen.value = true
}

function handleSuccess() {
  // Store updates automatically
}

function getRequisitionText(): string {
  const dateStr = new Date().toLocaleDateString('ru-RU')
  let text = `📋 ЗАЯВКА НА ЗАКУПКУ / ВЫДАЧУ (${dateStr})\n`
  text += `Всего позиций: ${partsStore.lowStockParts.length} шт\n`
  text += `------------------------------------\n`

  partsStore.lowStockParts.forEach((item, idx) => {
    text += `${idx + 1}. [${item.code}] ${item.name}\n`
    text += `   К заказу: ${item.deficit} шт (Остаток: ${item.totalStock} шт, Мин: ${item.min_stock} шт)\n`
    if (item.location) text += `   Ячейка: ${item.location}\n`
  })

  return text
}

async function copyRequisitionText() {
  const text = getRequisitionText()
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Скопировано в буфер!',
      description: 'Список можно отправить в мессенджер или на печать',
      color: 'emerald'
    })
  } catch {
    toast.add({
      title: 'Ошибка',
      description: 'Не удалось скопировать текст',
      color: 'red'
    })
  }
}

async function shareRequisition() {
  const text = getRequisitionText()
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Заявка на запчасти',
        text
      })
    } catch {
      // User cancelled
    }
  } else {
    await copyRequisitionText()
  }
}

function downloadRequisitionExcel() {
  const data = partsStore.lowStockParts.map(item => ({
    'Артикул': item.code,
    'Наименование': item.name,
    'Категория': item.category,
    'Ячейка': item.location,
    'Текущий остаток': item.totalStock,
    'Новые (шт)': item.stock_new,
    'Б/У (шт)': item.stock_used,
    'Минимальный остаток': item.min_stock,
    'Требуется заказать (шт)': item.deficit
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Дефицит')
  XLSX.writeFile(workbook, `zayavka_deficit_${new Date().toISOString().slice(0, 10)}.xlsx`)

  toast.add({
    title: 'Файл сформирован',
    description: 'Excel таблица загружена',
    color: 'emerald'
  })
}
</script>
