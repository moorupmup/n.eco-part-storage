<template>
  <div>
    <!-- Top Header -->
    <AppHeader title="Бэкап и управление" subtitle="Резервное копирование и экспорт" />

    <div class="px-4 py-3 space-y-4">
      <!-- Database Status Card -->
      <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-primary-500/15 border border-primary-500/30 flex items-center justify-center text-primary-400">
            <UIcon name="i-lucide-database" class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-100">База данных SQLite</h3>
            <p class="text-xs text-zinc-400">Автономное локальное хранилище</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div class="text-zinc-500 text-[11px]">Позиций запчастей</div>
            <div class="text-base font-bold text-zinc-200 font-mono mt-0.5">
              {{ partsStore.stats.totalPositions }}
            </div>
          </div>
          <div class="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
            <div class="text-zinc-500 text-[11px]">Всего на складе</div>
            <div class="text-base font-bold text-zinc-200 font-mono mt-0.5">
              {{ partsStore.stats.totalNewQuantity + partsStore.stats.totalUsedQuantity }} <span class="text-xs font-normal text-zinc-500">шт</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Section -->
      <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <UIcon name="i-lucide-download" class="w-4 h-4 text-emerald-400" />
          Экспорт и сохранение бэкапа
        </div>

        <div class="space-y-2">
          <UButton
            color="gray"
            variant="solid"
            icon="i-lucide-file-spreadsheet"
            label="Экспорт каталога в Excel (.xlsx)"
            block
            size="md"
            class="justify-start text-xs font-semibold py-2.5"
            @click="exportPartsExcel"
          />

          <UButton
            color="gray"
            variant="solid"
            icon="i-lucide-history"
            label="Экспорт истории операций в Excel"
            block
            size="md"
            class="justify-start text-xs font-semibold py-2.5"
            @click="exportHistoryExcel"
          />

          <UButton
            color="gray"
            variant="solid"
            icon="i-lucide-file-json"
            label="Полный JSON бэкап (База целиком)"
            block
            size="md"
            class="justify-start text-xs font-semibold py-2.5"
            @click="exportJSON"
          />
        </div>
      </div>

      <!-- Import Section -->
      <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
        <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
          <UIcon name="i-lucide-upload" class="w-4 h-4 text-blue-400" />
          Импорт и восстановление
        </div>

        <p class="text-xs text-zinc-400">
          Загрузите файл Excel (.xlsx, .xls) или CSV со списком запчастей для автоматического добавления в базу.
        </p>

        <div>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx, .xls, .csv, .json"
            class="hidden"
            @change="handleFileUpload"
          />
          <UButton
            color="primary"
            variant="soft"
            icon="i-lucide-folder-up"
            label="Выбрать файл Excel / CSV / JSON"
            block
            size="md"
            :loading="isImporting"
            class="font-semibold py-2.5"
            @click="triggerFileInput"
          />
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
        <div class="flex items-center gap-2 text-xs font-bold text-rose-400">
          <UIcon name="i-lucide-alert-octagon" class="w-4 h-4 text-rose-500" />
          Опасная зона
        </div>

        <p class="text-xs text-zinc-400">
          Полная очистка всех данных каталога запчастей и истории операций.
        </p>

        <UButton
          color="rose"
          variant="outline"
          icon="i-lucide-trash-2"
          label="Очистить всю базу данных"
          block
          size="sm"
          class="font-semibold"
          @click="isClearConfirmOpen = true"
        />
      </div>

      <!-- System info footer -->
      <div class="pt-2 text-center text-[11px] text-zinc-400 space-y-1">
        <div>Склад Запчастей v1.0.0</div>
        <div>Стек: Vue 3 · Nuxt 3 · Pinia · Nuxt UI · SQLite · Capacitor</div>
      </div>
    </div>

    <!-- Confirm Clear Modal -->
    <UModal v-model="isClearConfirmOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <div class="flex items-center gap-2 text-rose-400 font-bold text-base">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-rose-500" />
          Подтвердите очистку
        </div>
        <p class="text-xs text-zinc-300">
          Все запчасти и история движений будут безвозвратно удалены. Перед очисткой рекомендуется сделать экспорт в Excel или JSON.
        </p>
        <div class="flex items-center gap-2 pt-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isClearConfirmOpen = false"
          />
          <UButton
            color="rose"
            variant="solid"
            label="Удалить все"
            block
            class="flex-1 font-bold"
            @click="executeClearAll"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { usePartsStore } from '~/stores/parts'
import { useTransactionsStore } from '~/stores/transactions'
import { dbService } from '~/services/database'
import {
  exportPartsToExcel,
  exportTransactionsToExcel,
  exportFullBackupJSON,
  parseExcelOrCSV
} from '~/utils/exportImport'

const partsStore = usePartsStore()
const transStore = useTransactionsStore()
const toast = useToast()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const isClearConfirmOpen = ref(false)

function exportPartsExcel() {
  exportPartsToExcel(partsStore.parts)
  toast.add({
    title: 'Каталог выгружен',
    description: 'Файл Excel успешно сохранен',
    color: 'emerald'
  })
}

function exportHistoryExcel() {
  exportTransactionsToExcel(transStore.transactions)
  toast.add({
    title: 'История выгружена',
    description: 'Файл Excel успешно сохранен',
    color: 'emerald'
  })
}

async function exportJSON() {
  const { parts, transactions } = await dbService.exportAllData()
  exportFullBackupJSON(parts, transactions)
  toast.add({
    title: 'JSON бэкап сохранен',
    description: 'Полная копия базы готова',
    color: 'emerald'
  })
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    if (file.name.endsWith('.json')) {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await dbService.importData(data)
      await partsStore.fetchParts()
      await transStore.fetchTransactions()
      toast.add({
        title: 'Бэкап восстановлен',
        description: `Импортировано запчастей: ${res.importedParts}`,
        color: 'emerald'
      })
    } else {
      const parts = await parseExcelOrCSV(file)
      const res = await dbService.importData({ parts })
      await partsStore.fetchParts()
      toast.add({
        title: 'Импорт завершен',
        description: `Добавлено позиций: ${res.importedParts}`,
        color: 'emerald'
      })
    }
  } catch (err: any) {
    toast.add({
      title: 'Ошибка импорта',
      description: err.message || 'Не удалось прочитать файл',
      color: 'red'
    })
  } finally {
    isImporting.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

async function executeClearAll() {
  try {
    await dbService.clearAllData()
    await partsStore.fetchParts()
    await transStore.fetchTransactions()
    toast.add({
      title: 'База данных очищена',
      color: 'gray'
    })
    isClearConfirmOpen.value = false
  } catch (err: any) {
    toast.add({
      title: 'Ошибка',
      description: err.message,
      color: 'red'
    })
  }
}
</script>
