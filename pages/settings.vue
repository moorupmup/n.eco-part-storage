<template>
  <div>
    <!-- Top Header with Back button -->
    <header class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 pt-safe transition-colors">
      <div class="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/"
            class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 active:scale-95 transition-all"
            title="Назад"
          >
            <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
          </NuxtLink>
          <div>
            <h1 class="text-sm font-bold text-zinc-100 leading-none">
              Обновление системы
            </h1>
            <p class="text-[11px] text-zinc-400 mt-0.5 leading-none">
              Управление версиями и релизы
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            {{ currentVersion }}
          </span>
        </div>
      </div>
    </header>

    <div class="px-4 py-4 space-y-4 max-w-lg mx-auto">
      <!-- App Brand & Version Card -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 relative overflow-hidden">
        <div class="flex items-start justify-between gap-3 relative z-10">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-950/40">
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
                N.ECO PART STORAGE
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">
                Текущая версия: <span class="text-emerald-400 font-mono font-semibold">{{ currentVersion }}</span>
              </p>
            </div>
          </div>

          <span
            class="text-[11px] px-2 py-0.5 rounded-full font-semibold border"
            :class="hasUpdate ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'"
          >
            {{ hasUpdate ? 'Есть апдейт' : 'Актуально' }}
          </span>
        </div>
      </div>

      <!-- Update Status Card -->
      <div class="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
              <UIcon name="i-lucide-cloud-download" class="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 class="text-xs font-bold text-zinc-200">
                Обновление приложения
              </h3>
              <p class="text-[11px] text-zinc-400">
                Проверка релизов в GitHub репозитории
              </p>
            </div>
          </div>

          <button
            type="button"
            :disabled="isChecking"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all disabled:opacity-50"
            @click="checkForUpdates(true)"
          >
            <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" :class="{ 'animate-spin': isChecking }" />
            <span>{{ isChecking ? 'Проверка...' : 'Проверить' }}</span>
          </button>
        </div>

        <!-- STATE: Update Available -->
        <div
          v-if="hasUpdate && latestRelease"
          class="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-3"
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

          <!-- Direct Download & Install Button -->
          <a
            v-if="apkDownloadUrl"
            :href="apkDownloadUrl"
            target="_blank"
            class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all"
          >
            <UIcon name="i-lucide-download" class="w-4 h-4 stroke-[2.5]" />
            <span>Скачать и обновить (.apk)</span>
          </a>
        </div>

        <!-- STATE: Up to Date -->
        <div
          v-else-if="checkCompleted && !hasUpdate"
          class="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-zinc-300"
        >
          <div class="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-check" class="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div class="font-bold text-zinc-100">У вас установлена последняя версия</div>
            <div class="text-[11px] text-zinc-400">Обновлений не требуется, приложение готово к работе</div>
          </div>
        </div>

        <!-- STATE: Error / Offline -->
        <div
          v-if="errorMessage"
          class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
        >
          <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Last Checked Footer -->
        <div class="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
          <span>Репозиторий: moorupmup/n.eco-part-storage</span>
          <span v-if="lastChecked">Проверено: {{ lastChecked }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const currentVersion = 'v1.0.0'
const repoUrl = 'https://api.github.com/repos/moorupmup/n.eco-part-storage/releases/latest'

interface ReleaseAsset {
  name: string
  size: number
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  assets: ReleaseAsset[]
}

const isChecking = ref(false)
const checkCompleted = ref(false)
const latestRelease = ref<GitHubRelease | null>(null)
const hasUpdate = ref(false)
const errorMessage = ref('')
const lastChecked = ref('')

const apkAsset = computed(() => {
  if (!latestRelease.value?.assets) return null
  return latestRelease.value.assets.find(a => a.name.endsWith('.apk')) || latestRelease.value.assets[0]
})

const apkDownloadUrl = computed(() => {
  return apkAsset.value?.browser_download_url || latestRelease.value?.html_url
})

onMounted(() => {
  checkForUpdates(false)
})

async function checkForUpdates(manual = true) {
  isChecking.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(repoUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    if (res.status === 404) {
      checkCompleted.value = true
      hasUpdate.value = false
      lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      return
    }

    if (!res.ok) {
      throw new Error(`Ошибка GitHub API (${res.status})`)
    }

    const data: GitHubRelease = await res.json()
    latestRelease.value = data

    // Compare versions (e.g. "v1.0.1" vs "v1.0.0")
    const cleanCurrent = currentVersion.replace(/^v/, '')
    const cleanLatest = data.tag_name ? data.tag_name.replace(/^v/, '') : cleanCurrent

    hasUpdate.value = compareVersions(cleanLatest, cleanCurrent) > 0
    checkCompleted.value = true
    lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch (err: any) {
    if (manual) {
      errorMessage.value = err.message || 'Не удалось связаться с сервером обновлений'
    }
  } finally {
    isChecking.value = false
  }
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(n => parseInt(n) || 0)
  const parts2 = v2.split('.').map(n => parseInt(n) || 0)
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0
    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }
  return 0
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatBytes(bytes: number): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} МБ`
}
</script>
