<template>
  <div>
    <!-- Top Header -->
    <AppHeader title="Бэкап и экспорт" subtitle="Резервное копирование базы данных" />

    <div class="px-4 sm:px-6 md:px-8 py-3 sm:py-4 space-y-4 max-w-5xl mx-auto">
      <!-- Database Status Card -->
      <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
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
            <div class="text-zinc-500 text-[11px]">Всего в наличии (в рюкзаке)</div>
            <div class="text-base font-bold text-zinc-200 font-mono mt-0.5">
              {{ partsStore.stats.totalNewQuantity + partsStore.stats.totalUsedQuantity }} <span class="text-xs font-normal text-zinc-500">шт</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Sections: 2-column on tablet -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <!-- Column 1: Export Section -->
        <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-sm">
          <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
            <UIcon name="i-lucide-download" class="w-4 h-4 text-emerald-400" />
            Экспорт и сохранение бэкапа
          </div>

          <div class="space-y-2">
            <button
              type="button"
              class="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
              @click="exportPartsExcel"
            >
              <UIcon name="i-lucide-file-spreadsheet" class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Экспорт каталога в Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
              @click="exportHistoryExcel"
            >
              <UIcon name="i-lucide-history" class="w-4 h-4 text-blue-400 shrink-0" />
              <span>Экспорт истории операций в Excel</span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2.5 w-full py-2.5 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 active:scale-[0.99] transition-all cursor-pointer"
              @click="exportJSON"
            >
              <UIcon name="i-lucide-file-json" class="w-4 h-4 text-amber-400 shrink-0" />
              <span>Полный JSON бэкап (База целиком)</span>
            </button>

            <!-- Share button (when Web Share API is available, e.g. on mobile Android/iOS) -->
            <button
              v-if="canShare"
              type="button"
              class="flex items-center justify-center gap-2 w-full py-2.5 px-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold text-emerald-400 active:scale-[0.99] transition-all cursor-pointer mt-1"
              @click="shareJSON"
            >
              <UIcon name="i-lucide-share-2" class="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Отправить бэкап в Telegram / Диск</span>
            </button>
          </div>

          <!-- Info block about save location -->
          <div class="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <div class="flex items-center gap-1.5 text-zinc-300 font-semibold">
              <UIcon name="i-lucide-folder-down" class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Куда сохраняются файлы?</span>
            </div>
            <p class="leading-relaxed text-zinc-400">
              • Файлы скачиваются в системную папку <strong>«Загрузки» (Downloads)</strong> на вашем устройстве.<br />
              • В мобильном приложении файл также пишется в системную папку <strong>«Документы»</strong>.<br />
              • Название файла бэкапа: <span class="font-mono text-amber-300 text-[10px]">backup_neco_ГГГГ-ММ-ДД.json</span>.<br />
              • Кнопка «Отправить бэкап» позволяет сразу переслать файл в Telegram (в «Избранное») или на Google Диск.
            </p>
          </div>
        </div>

        <!-- Column 2: Import & Danger Zone -->
        <div class="space-y-4">
          <!-- Import Section -->
          <div class="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-sm">
            <div class="flex items-center gap-2 text-xs font-bold text-zinc-200">
              <UIcon name="i-lucide-upload" class="w-4 h-4 text-blue-400" />
              Импорт и восстановление
            </div>

            <p class="text-xs text-zinc-400 leading-relaxed">
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
              <button
                type="button"
                :disabled="isImporting"
                class="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-400 text-xs font-bold active:scale-[0.99] transition-all disabled:opacity-40 cursor-pointer"
                @click="triggerFileInput"
              >
                <UIcon v-if="isImporting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
                <UIcon v-else name="i-lucide-folder-up" class="w-4 h-4" />
                <span>Выбрать файл Excel / CSV / JSON</span>
              </button>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3 shadow-sm">
            <div class="flex items-center gap-2 text-xs font-bold text-rose-400">
              <UIcon name="i-lucide-alert-octagon" class="w-4 h-4 text-rose-500" />
              Опасная зона
            </div>

            <p class="text-xs text-zinc-400 leading-relaxed">
              Полная очистка всех данных каталога запчастей и истории операций.
            </p>

            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 border border-rose-500/30 text-rose-400 text-xs font-semibold active:scale-[0.99] transition-all cursor-pointer"
              @click="isClearConfirmOpen = true"
            >
              <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
              <span>Очистить всю базу данных</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Clear Modal -->
    <UModal v-model="isClearConfirmOpen" :ui="{ width: 'sm:max-w-md md:max-w-lg' }">
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
  parseExcelOrCSV,
  shareFile
} from '~/utils/exportImport'

const partsStore = usePartsStore()
const transStore = useTransactionsStore()
const toast = useToast()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const isClearConfirmOpen = ref(false)

const canShare = ref(false)

onMounted(() => {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    canShare.value = true
  }
})

async function exportPartsExcel() {
  const res = await exportPartsToExcel(partsStore.parts)
  toast.add({
    title: 'Каталог выгружен',
    description: `Файл ${res.filename} сохранён в ${res.location}`,
    color: 'emerald'
  })
}

async function exportHistoryExcel() {
  const res = await exportTransactionsToExcel(transStore.transactions)
  toast.add({
    title: 'История выгружена',
    description: `Файл ${res.filename} сохранён в ${res.location}`,
    color: 'emerald'
  })
}

async function exportJSON() {
  const { parts, transactions } = await dbService.exportAllData()
  const res = await exportFullBackupJSON(parts, transactions)
  toast.add({
    title: 'JSON бэкап сохранен',
    description: `Файл ${res.filename} сохранён в ${res.location}`,
    color: 'emerald'
  })
}

async function shareJSON() {
  const { parts, transactions } = await dbService.exportAllData()
  const filename = `backup_neco_${new Date().toISOString().slice(0, 10)}.json`
  const jsonStr = JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    parts,
    transactions
  }, null, 2)

  const shared = await shareFile(jsonStr, filename, 'application/json', 'Бэкап базы N.ECO')
  if (!shared) {
    await exportJSON()
  } else {
    toast.add({
      title: 'Бэкап отправлен',
      description: 'Резервная копия передана',
      color: 'emerald'
    })
  }
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
