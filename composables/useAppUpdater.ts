import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import { App } from '@capacitor/app'
import { usePocketBase } from '~/composables/usePocketBase'
import pkg from '~/package.json'

export interface ReleaseAsset {
  name: string
  size: number
  browser_download_url: string
}

export interface GenericRelease {
  version: string
  name: string
  body: string
  published_at: string
  is_ota: boolean
  download_url: string
  bundle_url?: string
  size?: number
  assets?: ReleaseAsset[]
}

// Module-scoped singleton state shared across the whole app
const currentVersion = ref(pkg.version ? (pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`) : 'v1.0.14')
const repoUrl = 'https://api.github.com/repos/moorupmup/n.eco-part-storage/releases/latest'

const isChecking = ref(false)
const checkCompleted = ref(false)
const latestRelease = ref<GenericRelease | null>(null)
const hasUpdate = ref(false)
const isUpdateModalOpen = ref(false)
const errorMessage = ref('')
const lastChecked = ref('')

// In-app download & install state
const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadStatus = ref('')
const installError = ref('')
const isOtaReady = ref(false)

export function useAppUpdater() {
  const isOta = computed(() => latestRelease.value?.is_ota ?? false)

  const apkAsset = computed(() => {
    if (!latestRelease.value?.assets) return null
    return latestRelease.value.assets.find(a => a.name.endsWith('.apk')) || latestRelease.value.assets[0]
  })

  const apkDownloadUrl = computed(() => {
    return latestRelease.value?.download_url || latestRelease.value?.bundle_url || ''
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
      const cleanCurrent = currentVersion.value.replace(/^v/, '')

      // 1. Try checking PocketBase for OTA / APK updates first (Instant server in Moscow)
      let foundPbRelease: GenericRelease | null = null
      try {
        const pb = usePocketBase()
        const records = await pb.collection('app_updates').getList(1, 1, {
          sort: '-build_number'
        })

        if (records?.items?.length > 0) {
          const item = records.items[0]
          const recVer = (item.version || '').replace(/^v/, '')
          if (recVer && compareVersions(recVer, cleanCurrent) > 0 && item.apk_file) {
            const apkUrl = pb.files.getUrl(item, item.apk_file)

            foundPbRelease = {
              version: item.version.startsWith('v') ? item.version : `v${item.version}`,
              name: `Обновление ${item.version}`,
              body: item.changelog || 'Улучшения производительности и исправление ошибок',
              published_at: item.created || new Date().toISOString(),
              is_ota: false,
              download_url: apkUrl,
              bundle_url: '',
              size: 35000000
            }
          }
        }
      } catch {
        // PocketBase offline or unreachable, proceed to GitHub fallback
      }

      if (foundPbRelease) {
        latestRelease.value = foundPbRelease
        hasUpdate.value = true
        checkCompleted.value = true
        lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

        if (!manual) {
          isUpdateModalOpen.value = true
        }
        return
      }

      // 2. Fallback: Check GitHub Releases API
      const res = await fetch(repoUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      })

      if (res.status === 404) {
        checkCompleted.value = true
        hasUpdate.value = false
        lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        return
      }

      if (!res.ok) {
        throw new Error(`Ошибка проверки обновлений (${res.status})`)
      }

      const ghData = await res.json()
      const cleanLatest = ghData.tag_name ? ghData.tag_name.replace(/^v/, '') : cleanCurrent
      const isNewer = compareVersions(cleanLatest, cleanCurrent) > 0

      const apkAssetFound = ghData.assets?.find((a: any) => a.name.endsWith('.apk')) || ghData.assets?.[0]

      latestRelease.value = {
        version: ghData.tag_name,
        name: ghData.name || ghData.tag_name,
        body: ghData.body || '',
        published_at: ghData.published_at,
        is_ota: false,
        download_url: apkAssetFound?.browser_download_url || ghData.html_url || '',
        assets: ghData.assets || []
      }

      hasUpdate.value = isNewer
      checkCompleted.value = true
      lastChecked.value = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      if (hasUpdate.value && !manual) {
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
  }

  async function downloadAndInstall() {
    const release = latestRelease.value
    if (!release) return

    isDownloading.value = true
    downloadProgress.value = 0
    installError.value = ''
    downloadStatus.value = 'Подготовка к загрузке...'

    // Full APK Update (Standard Native Flow)
    const url = apkDownloadUrl.value
    if (!url) return

    const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

    if (isAndroid) {
      let progressListener: any = null
      try {
        try {
          await Filesystem.deleteFile({
            directory: Directory.Cache,
            path: 'update.apk'
          })
        } catch {}

        downloadStatus.value = 'Скачивание полного APK...'

        progressListener = await Filesystem.addListener('progress', (status) => {
          if (status.contentLength > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((status.bytes / status.contentLength) * 100)))
            downloadProgress.value = percent
            downloadStatus.value = `Загрузка: ${percent}% (${formatBytes(status.bytes)} из ${formatBytes(status.contentLength)})`
          } else {
            downloadStatus.value = `Загрузка: ${formatBytes(status.bytes)}`
          }
        })

        const res = await Filesystem.downloadFile({
          url,
          path: 'update.apk',
          directory: Directory.Cache,
          progress: true
        })

        downloadProgress.value = 100
        downloadStatus.value = 'Запуск установщика...'

        if (typeof localStorage !== 'undefined' && release.version) {
          localStorage.setItem('neco_installed_update_tag', release.version)
        }
        currentVersion.value = release.version
        hasUpdate.value = false

        await FileOpener.open({
          filePath: res.path,
          contentType: 'application/vnd.android.package-archive',
          openWithDefault: true
        })

        downloadStatus.value = 'Окно установки открыто'
      } catch (err: any) {
        installError.value = err.message || 'Не удалось запустить установку APK'
        downloadStatus.value = 'Ошибка установки'
      } finally {
        if (progressListener) {
          try {
            await progressListener.remove()
          } catch {}
        }
        isDownloading.value = false
      }
    } else {
      // Browser fallback
      try {
        downloadStatus.value = 'Загрузка через браузер...'
        const a = document.createElement('a')
        a.href = url
        a.download = 'neco-part-storage-update.apk'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        downloadProgress.value = 100
        downloadStatus.value = 'Файл передан на скачивание'
        hasUpdate.value = false
      } catch (err: any) {
        installError.value = err.message || 'Ошибка загрузки'
      } finally {
        isDownloading.value = false
      }
    }
  }

  function compareVersions(v1: string, v2: string): number {
    const parts1 = v1.replace(/^v/, '').split('.').map(n => parseInt(n) || 0)
    const parts2 = v2.replace(/^v/, '').split('.').map(n => parseInt(n) || 0)
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const num1 = parts1[i] || 0
      const num2 = parts2[i] || 0
      if (num1 > num2) return 1
      if (num1 < num2) return -1
    }
    return 0
  }

  function formatDate(iso: string): string {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return iso
    }
  }

  function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
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
    isOta,
    isOtaReady,
    initVersion,
    checkForUpdates,
    dismissUpdate,
    downloadAndInstall,
    formatDate,
    formatBytes
  }
}
