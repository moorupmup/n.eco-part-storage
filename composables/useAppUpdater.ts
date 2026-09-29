import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import { App } from '@capacitor/app'
import pkg from '~/package.json'

export interface ReleaseAsset {
  name: string
  size: number
  browser_download_url: string
}

export interface GitHubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  assets: ReleaseAsset[]
}

// Module-scoped singleton state shared across the whole app
const currentVersion = ref(pkg.version ? (pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`) : 'v1.0.2')
const repoUrl = 'https://api.github.com/repos/moorupmup/n.eco-part-storage/releases/latest'

const isChecking = ref(false)
const checkCompleted = ref(false)
const latestRelease = ref<GitHubRelease | null>(null)
const hasUpdate = ref(false)
const isUpdateModalOpen = ref(false)
const errorMessage = ref('')
const lastChecked = ref('')

// In-app download & install state
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadStatus = ref('')
const installError = ref('')

export function useAppUpdater() {
  const apkAsset = computed(() => {
    if (!latestRelease.value?.assets) return null
    return latestRelease.value.assets.find(a => a.name.endsWith('.apk')) || latestRelease.value.assets[0]
  })

  const apkDownloadUrl = computed(() => {
    return apkAsset.value?.browser_download_url || latestRelease.value?.html_url || ''
  })

  async function initVersion() {
    // 1. Check if user already installed an update through the in-app updater
    if (typeof localStorage !== 'undefined') {
      const lastInstalled = localStorage.getItem('neco_installed_update_tag')
      if (lastInstalled) {
        const cleanInstalled = lastInstalled.replace(/^v/, '')
        const cleanCurrent = currentVersion.value.replace(/^v/, '')
        if (compareVersions(cleanInstalled, cleanCurrent) > 0) {
          currentVersion.value = lastInstalled.startsWith('v') ? lastInstalled : `v${lastInstalled}`
        }
      }
    }

    // 2. If running on native Capacitor Android, query package info
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo()
        // If native info returns a specific version (other than the generic template '1.0')
        if (info?.version && info.version !== '1.0') {
          const cleanInfo = info.version.replace(/^v/, '')
          const cleanCurrent = currentVersion.value.replace(/^v/, '')
          if (compareVersions(cleanInfo, cleanCurrent) > 0) {
            currentVersion.value = info.version.startsWith('v') ? info.version : `v${info.version}`
          }
        }
      } catch {
        // fallback to default
      }
    }
  }

  async function checkForUpdates(manual = true) {
    isChecking.value = true
    errorMessage.value = ''

    try {
      await initVersion()

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

      // Compare versions
      const cleanCurrent = currentVersion.value.replace(/^v/, '')
      const cleanLatest = data.tag_name ? data.tag_name.replace(/^v/, '') : cleanCurrent

      const isNewer = compareVersions(cleanLatest, cleanCurrent) > 0

      // Check if this version was already dismissed recently (within 24h)
      let isDismissedRecently = false
      if (typeof localStorage !== 'undefined') {
        const dismissedTag = localStorage.getItem('neco_dismissed_update_tag')
        const dismissedTime = Number(localStorage.getItem('neco_dismissed_update_time') || 0)
        const ONE_DAY = 24 * 60 * 60 * 1000
        if (dismissedTag === data.tag_name && Date.now() - dismissedTime < ONE_DAY) {
          isDismissedRecently = true
        }
      }

      hasUpdate.value = isNewer
      checkCompleted.value = true
      lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      // Automatically show modal on automatic check ONLY if:
      // 1. There is actually a newer version
      // 2. User hasn't dismissed it in the last 24h
      if (hasUpdate.value && !manual && !isDismissedRecently) {
        isUpdateModalOpen.value = true
      }
    } catch (err: any) {
      if (manual) {
        errorMessage.value = err.message || 'Не удалось связаться с сервером обновлений'
      }
    } finally {
      isChecking.value = false
    }
  }

  function dismissUpdate() {
    isUpdateModalOpen.value = false
    if (typeof localStorage !== 'undefined' && latestRelease.value?.tag_name) {
      localStorage.setItem('neco_dismissed_update_tag', latestRelease.value.tag_name)
      localStorage.setItem('neco_dismissed_update_time', String(Date.now()))
    }
  }

  async function downloadAndInstall() {
    const url = apkDownloadUrl.value
    if (!url) return

    isDownloading.value = true
    downloadProgress.value = 0
    installError.value = ''
    downloadStatus.value = 'Подготовка к загрузке...'

    const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

    if (isAndroid) {
      let progressListener: any = null

      try {
        // Clean any old apk from cache
        try {
          await Filesystem.deleteFile({
            directory: Directory.Cache,
            path: 'update.apk'
          })
        } catch {
          // ignore
        }

        downloadStatus.value = 'Скачивание обновления...'

        progressListener = await Filesystem.addListener('progress', (status) => {
          if (status.contentLength > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((status.bytes / status.contentLength) * 100)))
            downloadProgress.value = percent
            downloadStatus.value = `Загрузка: ${percent}% (${formatBytes(status.bytes)} из ${formatBytes(status.contentLength)})`
          } else {
            downloadStatus.value = `Загрузка: ${formatBytes(status.bytes)}`
          }
        })

        // Download directly to device cache
        const res = await Filesystem.downloadFile({
          url,
          path: 'update.apk',
          directory: Directory.Cache,
          progress: true
        })

        downloadProgress.value = 100
        downloadStatus.value = 'Запуск установщика...'

        // Save to localStorage that this release was installed
        if (typeof localStorage !== 'undefined' && latestRelease.value?.tag_name) {
          localStorage.setItem('neco_installed_update_tag', latestRelease.value.tag_name)
        }
        currentVersion.value = latestRelease.value?.tag_name || currentVersion.value
        hasUpdate.value = false

        // Trigger native Android installer
        await FileOpener.open({
          filePath: res.path,
          contentType: 'application/vnd.android.package-archive',
          openWithDefault: true
        })

        downloadStatus.value = 'Окно установки открыто'
      } catch (err: any) {
        console.error('Update error:', err)
        installError.value = err.message || 'Не удалось запустить установку'
        downloadStatus.value = 'Ошибка установки'
      } finally {
        if (progressListener) {
          try {
            await progressListener.remove()
          } catch {
            // ignore
          }
        }
        isDownloading.value = false
      }
    } else {
      // Browser / desktop fallback
      try {
        downloadStatus.value = 'Загрузка через браузер...'
        const a = document.createElement('a')
        a.href = url
        a.download = apkAsset.value?.name || 'neco-part-storage.apk'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        downloadProgress.value = 100
        downloadStatus.value = 'Файл передан на скачивание'

        if (typeof localStorage !== 'undefined' && latestRelease.value?.tag_name) {
          localStorage.setItem('neco_installed_update_tag', latestRelease.value.tag_name)
        }
        currentVersion.value = latestRelease.value?.tag_name || currentVersion.value
        hasUpdate.value = false
      } catch (err: any) {
        installError.value = err.message || 'Ошибка загрузки'
      } finally {
        isDownloading.value = false
      }
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

  return {
    currentVersion,
    isChecking,
    checkCompleted,
    latestRelease,
    hasUpdate,
    isUpdateModalOpen,
    errorMessage,
    lastChecked,
    apkAsset,
    apkDownloadUrl,
    isDownloading,
    downloadProgress,
    downloadStatus,
    installError,
    initVersion,
    checkForUpdates,
    dismissUpdate,
    downloadAndInstall,
    formatDate,
    formatBytes
  }
}
