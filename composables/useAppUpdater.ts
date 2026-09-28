import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'

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

export function useAppUpdater() {
  const currentVersion = 'v1.0.0'
  const repoUrl = 'https://api.github.com/repos/moorupmup/n.eco-part-storage/releases/latest'

  const isChecking = ref(false)
  const checkCompleted = ref(false)
  const latestRelease = ref<GitHubRelease | null>(null)
  const hasUpdate = ref(false)
  const errorMessage = ref('')
  const lastChecked = ref('')

  // In-app download & install state
  const isDownloading = ref(false)
  const downloadProgress = ref(0)
  const downloadStatus = ref('')
  const installError = ref('')

  const apkAsset = computed(() => {
    if (!latestRelease.value?.assets) return null
    return latestRelease.value.assets.find(a => a.name.endsWith('.apk')) || latestRelease.value.assets[0]
  })

  const apkDownloadUrl = computed(() => {
    return apkAsset.value?.browser_download_url || latestRelease.value?.html_url || ''
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

      // Compare versions
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
  }
}
