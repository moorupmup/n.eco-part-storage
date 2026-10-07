<template>
  <div>
    <!-- Top Header with Back button -->
    <header class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 pt-safe transition-colors">
      <div class="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto">
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/"
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 active:scale-95 transition-all"
            title="Назад"
          >
            <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
          </NuxtLink>
          <div>
            <h1 class="text-sm sm:text-base font-bold text-zinc-100 leading-none">
              Настройки
            </h1>
            <p class="text-[11px] sm:text-xs text-zinc-400 mt-0.5 leading-none">
              Версия приложения
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            {{ currentVersion }}
          </span>
        </div>
      </div>
    </header>

    <div class="px-4 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 max-w-4xl mx-auto">
      <!-- Unified App Brand & Update Card -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40 shrink-0">
              <svg class="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 21V9.5L12 4L21 9.5V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M8 21V12.5C8 12.22 8.22 12 8.5 12H15.5C15.78 12 16 12.22 16 12.5V21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                <path d="M8 15H16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
                <path d="M8 18H16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M12 4V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </div>
            <div>
              <h2 class="text-sm font-extrabold text-zinc-100 tracking-tight">
                <span class="text-emerald-400 font-black">N.ECO</span> PART STORAGE
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">
                Текущая версия: <span class="text-emerald-400 font-mono font-semibold">{{ currentVersion }}</span>
              </p>
            </div>
          </div>

          <span
            class="text-[11px] px-2.5 py-1 rounded-full font-semibold border"
            :class="hasUpdate ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'"
          >
            {{ hasUpdate ? 'Есть апдейт' : 'Актуально' }}
          </span>
        </div>

        <!-- Button to Check for Updates inside this card -->
        <div class="pt-0.5">
          <button
            type="button"
            :disabled="isChecking"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 active:scale-[0.98] border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-all disabled:opacity-50"
            @click="checkForUpdates(true)"
          >
            <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5 text-emerald-400" :class="{ 'animate-spin': isChecking }" />
            <span>{{ isChecking ? 'Проверка обновлений...' : 'Проверить обновления' }}</span>
          </button>
        </div>

        <!-- Status message below button -->
        <div v-if="checkCompleted && !hasUpdate" class="text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 pt-0.5">
          <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
          <span>У вас установлена последняя версия</span>
          <span v-if="lastChecked">({{ lastChecked }})</span>
        </div>

        <div v-if="errorMessage" class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Update Details & Download (Only visible when a new version exists) -->
      <div
        v-if="hasUpdate && latestRelease"
        class="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono mb-1">
              Новая версия: {{ latestRelease.tag_name }}
            </span>
            <h4 class="text-sm font-bold text-zinc-100">
              {{ latestRelease.name || 'Официальный релиз' }}
            </h4>
            <p class="text-[11px] text-zinc-400 mt-0.5">
              Опубликовано: {{ formatDate(latestRelease.published_at) }}
            </p>
          </div>

          <div v-if="apkAsset" class="text-right">
            <span class="text-xs font-mono font-semibold text-zinc-300">
              {{ formatBytes(apkAsset.size) }}
            </span>
          </div>
        </div>

        <!-- Release Notes / Changelog -->
        <div v-if="latestRelease.body" class="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
          <div class="font-semibold text-zinc-400 text-[11px]">Что нового:</div>
          <div class="whitespace-pre-line text-zinc-300 leading-relaxed font-sans text-xs">
            {{ latestRelease.body }}
          </div>
        </div>

        <!-- Seamless In-App Install Button & Progress -->
        <div v-if="apkDownloadUrl" class="space-y-2 pt-1">
          <button
            v-if="!isDownloading"
            type="button"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            @click="downloadAndInstall"
          >
            <UIcon name="i-lucide-download" class="w-4 h-4 stroke-[2.5]" />
            <span>Установить обновление прямо сейчас</span>
          </button>

          <!-- Active In-App Download Progress -->
          <div
            v-else
            class="p-3.5 rounded-xl bg-zinc-950/90 border border-emerald-500/40 space-y-2.5 shadow-inner"
          >
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-emerald-300 flex items-center gap-2">
                <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-emerald-400" />
                <span>{{ downloadStatus || 'Загрузка обновления...' }}</span>
              </span>
              <span class="font-mono font-bold text-emerald-400">{{ downloadProgress }}%</span>
            </div>

            <!-- Progress Track -->
            <div class="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 ease-out rounded-full"
                :style="{ width: `${downloadProgress}%` }"
              />
            </div>

            <p class="text-[11px] text-zinc-400 text-center leading-tight">
              Файл скачивается напрямую внутри приложения. По завершении сразу откроется системное окно установки.
            </p>
          </div>

          <!-- Error message if install fails -->
          <div
            v-if="installError"
            class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
          >
            <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 text-rose-400" />
            <span>{{ installError }}</span>
          </div>
        </div>
      </div>

      <!-- Analytics & Device Telemetry Card -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-transparent border border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-950/40 shrink-0">
              <UIcon name="i-lucide-bar-chart-3" class="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 class="text-sm font-extrabold text-zinc-100 tracking-tight">
                Статистика и аналитика (Aptabase)
              </h3>
              <p class="text-xs text-zinc-400 mt-0.5">
                Мониторинг активных устройств и пользователей
              </p>
            </div>
          </div>

          <span
            class="text-[11px] px-2.5 py-1 rounded-full font-semibold border"
            :class="isInitialized ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'"
          >
            {{ isInitialized ? 'Подключено' : 'Не настроено' }}
          </span>
        </div>

        <!-- Hardware & Device Details Detected -->
        <div v-if="deviceInfo" class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
          <div class="text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <UIcon :name="deviceInfo.isTablet ? 'i-lucide-tablet' : 'i-lucide-smartphone'" class="w-4 h-4 text-indigo-400" />
              <span>Данные текущего устройства:</span>
            </span>
            <span class="font-mono text-[10px] text-zinc-500 uppercase">{{ deviceInfo.platform }}</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div class="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
              <span class="text-[10px] text-zinc-500 block">Модель</span>
              <span class="font-semibold text-zinc-200 truncate block" :title="deviceInfo.model">
                {{ deviceInfo.manufacturer }} {{ deviceInfo.model }}
              </span>
            </div>
            <div class="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
              <span class="text-[10px] text-zinc-500 block">ОС</span>
              <span class="font-semibold text-zinc-200 block">
                {{ deviceInfo.operatingSystem }} {{ deviceInfo.osVersion || '' }}
              </span>
            </div>
            <div class="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
              <span class="text-[10px] text-zinc-500 block">Тип экрана</span>
              <span class="font-semibold text-zinc-200 block">
                {{ deviceInfo.isTablet ? 'Планшет' : 'Смартфон' }}
              </span>
            </div>
            <div class="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/60">
              <span class="text-[10px] text-zinc-500 block">Разрешение</span>
              <span class="font-mono text-zinc-200 block">
                {{ deviceInfo.screenWidth }}×{{ deviceInfo.screenHeight }}
              </span>
            </div>
          </div>
        </div>

        <!-- App Key Input -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-zinc-300">
            Aptabase App Key
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model="inputAppKey"
              type="text"
              placeholder="A-EU-xxxxxxxxxx"
              class="flex-1 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 shadow-inner"
            />
            <button
              type="button"
              class="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm shrink-0"
              @click="handleSaveKey"
            >
              Сохранить
            </button>
          </div>
          <p class="text-[11px] text-zinc-500 leading-normal">
            Бесплатный ключ создается за 1 минуту на <a href="https://aptabase.com" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:underline">aptabase.com</a>. После ввода статистика запусков и моделей устройств сразу отображается в вашем дашборде.
          </p>
        </div>

        <!-- Test Event Trigger -->
        <div v-if="isInitialized" class="pt-1 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            :disabled="isSendingPing"
            class="flex items-center gap-2 py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 active:scale-95 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            @click="handleSendPing"
          >
            <UIcon name="i-lucide-send" class="w-3.5 h-3.5 text-indigo-400" :class="{ 'animate-pulse': isSendingPing }" />
            <span>{{ isSendingPing ? 'Отправка...' : 'Отправить тестовый пинг в дашборд' }}</span>
          </button>

          <span v-if="lastEventSent" class="text-[10px] text-zinc-500">
            Посл. событие: {{ lastEventSent }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppUpdater } from '~/composables/useAppUpdater'
import { useAnalytics } from '~/composables/useAnalytics'

const {
  currentVersion,
  isChecking,
  checkCompleted,
  latestRelease,
  hasUpdate,
  errorMessage,
  lastChecked,
  apkAsset,
  apkDownloadUrl,
  isDownloading,
  downloadProgress,
  downloadStatus,
  installError,
  checkForUpdates,
  downloadAndInstall,
  formatDate,
  formatBytes
} = useAppUpdater()

const {
  aptabaseAppKey,
  isInitialized,
  lastEventSent,
  deviceInfo,
  loadDeviceInfo,
  setAppKey,
  sendTestEvent
} = useAnalytics()

const inputAppKey = ref('')
const isSendingPing = ref(false)
const toast = useToast()

const handleSaveKey = async () => {
  await setAppKey(inputAppKey.value)
  toast.add({
    title: inputAppKey.value.trim() ? 'Ключ аналитики сохранен' : 'Ключ очищен',
    description: inputAppKey.value.trim() ? 'Сбор телеметрии активирован' : 'Сбор аналитики отключен',
    color: inputAppKey.value.trim() ? 'emerald' : 'gray',
    icon: inputAppKey.value.trim() ? 'i-lucide-check-circle' : 'i-lucide-info'
  })
}

const handleSendPing = async () => {
  isSendingPing.value = true
  try {
    await sendTestEvent()
    toast.add({
      title: 'Пинг успешно отправлен',
      description: 'Проверьте событие test_ping в дашборде Aptabase',
      color: 'emerald',
      icon: 'i-lucide-check'
    })
  } catch (err) {
    toast.add({
      title: 'Ошибка отправки',
      description: String(err),
      color: 'rose',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    isSendingPing.value = false
  }
}

onMounted(() => {
  checkForUpdates(false)
  loadDeviceInfo()
  inputAppKey.value = aptabaseAppKey.value
})
</script>
