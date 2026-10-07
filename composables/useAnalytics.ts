import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Device, type DeviceInfo, type DeviceId } from '@capacitor/device'
import { init, trackEvent } from '@aptabase/web'
import pkg from '~/package.json'

export interface ExtendedDeviceInfo {
  model: string
  manufacturer: string
  platform: string
  operatingSystem: string
  osVersion: string
  isVirtual: boolean
  isTablet: boolean
  deviceId: string
  screenWidth: number
  screenHeight: number
  appVersion: string
}

// Module-scoped state
const aptabaseAppKey = ref<string>('')
const isInitialized = ref(false)
const isTrackingEnabled = ref(true)
const lastEventSent = ref<string>('')
const deviceInfo = ref<ExtendedDeviceInfo | null>(null)

// Storage keys
const KEY_STORAGE_APTABASE = 'neco_aptabase_key'
const KEY_STORAGE_ENABLED = 'neco_analytics_enabled'

// Default App Key (built into application)
const DEFAULT_APP_KEY = 'A-US-6174154603'

export function useAnalytics() {
  const currentAppVersion = pkg.version ? (pkg.version.startsWith('v') ? pkg.version : `v${pkg.version}`) : 'v1.0.7'

  /**
   * Detect device details using @capacitor/device and window screen
   */
  const loadDeviceInfo = async (): Promise<ExtendedDeviceInfo> => {
    if (deviceInfo.value) return deviceInfo.value

    let rawInfo: Partial<DeviceInfo> = {}
    let rawId: Partial<DeviceId> = {}

    try {
      if (Capacitor.isNativePlatform()) {
        rawInfo = await Device.getInfo()
        rawId = await Device.getId()
      } else {
        // Fallback for desktop / web browser testing
        rawInfo = {
          model: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
          manufacturer: navigator.vendor || 'Browser',
          platform: 'web',
          operatingSystem: navigator.platform.includes('Win') ? 'windows' : navigator.platform.includes('Mac') ? 'mac' : 'linux',
          osVersion: 'Web',
          isVirtual: false
        }
        rawId = {
          identifier: 'web-session-' + Math.random().toString(36).substring(2, 9)
        }
      }
    } catch (e) {
      console.warn('[Analytics] Failed to fetch hardware info:', e)
    }

    const width = typeof window !== 'undefined' ? window.innerWidth || window.screen?.width || 0 : 0
    const height = typeof window !== 'undefined' ? window.innerHeight || window.screen?.height || 0 : 0
    const smallestDim = Math.min(width, height)
    // Devices with shortest dimension >= 600px are typically tablets
    const isTablet = smallestDim >= 600 || (width >= 768 && height >= 768)

    const compiledInfo: ExtendedDeviceInfo = {
      model: rawInfo.model || 'Unknown Device',
      manufacturer: rawInfo.manufacturer || 'Unknown Brand',
      platform: rawInfo.platform || 'unknown',
      operatingSystem: rawInfo.operatingSystem || 'android',
      osVersion: rawInfo.osVersion || '',
      isVirtual: Boolean(rawInfo.isVirtual),
      isTablet,
      deviceId: rawId.identifier || 'unknown-id',
      screenWidth: typeof window !== 'undefined' ? window.screen?.width || 0 : 0,
      screenHeight: typeof window !== 'undefined' ? window.screen?.height || 0 : 0,
      appVersion: currentAppVersion
    }

    deviceInfo.value = compiledInfo
    return compiledInfo
  }

  /**
   * Initialize Aptabase SDK
   */
  const initAnalytics = async (customKey?: string) => {
    if (typeof window === 'undefined') return

    // Load preferences from localStorage
    const savedKey = localStorage.getItem(KEY_STORAGE_APTABASE) || ''
    const savedEnabled = localStorage.getItem(KEY_STORAGE_ENABLED)
    isTrackingEnabled.value = savedEnabled !== 'false'

    let runtimeKey = ''
    try {
      const config = useRuntimeConfig()
      runtimeKey = (config.public?.aptabaseAppKey as string) || ''
    } catch {
      // Ignore if outside Nuxt context
    }

    const key = (customKey || savedKey || runtimeKey || DEFAULT_APP_KEY).trim()
    aptabaseAppKey.value = key

    if (!key) {
      // Analytics key not provided yet
      return
    }

    if (!isTrackingEnabled.value) {
      return
    }

    try {
      init(key, {
        appVersion: currentAppVersion
      })
      isInitialized.value = true

      // Load device specs
      const dev = await loadDeviceInfo()

      // Track session start with comprehensive device metrics
      await track('app_started', {
        device_model: dev.model,
        device_brand: dev.manufacturer,
        os_version: dev.osVersion ? `${dev.operatingSystem} ${dev.osVersion}` : dev.operatingSystem,
        device_type: dev.isTablet ? 'tablet' : 'phone',
        screen_size: `${dev.screenWidth}x${dev.screenHeight}`,
        app_version: dev.appVersion,
        is_emulator: dev.isVirtual
      })
    } catch (err) {
      console.warn('[Analytics] Init error:', err)
    }
  }

  /**
   * Track an event in Aptabase with auto-attached device context
   */
  const track = async (eventName: string, props: Record<string, string | number | boolean> = {}) => {
    if (typeof window === 'undefined') return
    if (!aptabaseAppKey.value || !isTrackingEnabled.value) return

    try {
      const dev = deviceInfo.value || (await loadDeviceInfo())

      // Auto-attach device details if not already present
      const payload: Record<string, string | number | boolean> = {
        model: dev.model,
        brand: dev.manufacturer,
        device_type: dev.isTablet ? 'tablet' : 'phone',
        app_version: dev.appVersion,
        ...props
      }

      await trackEvent(eventName, payload)
      lastEventSent.value = `${eventName} (${new Date().toLocaleTimeString()})`
    } catch (e) {
      console.warn('[Analytics] Track event failed:', e)
    }
  }

  /**
   * Save App Key and re-initialize
   */
  const setAppKey = async (newKey: string) => {
    const trimmed = newKey.trim()
    aptabaseAppKey.value = trimmed
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem(KEY_STORAGE_APTABASE, trimmed)
      } else {
        localStorage.removeItem(KEY_STORAGE_APTABASE)
      }
    }
    if (trimmed) {
      await initAnalytics(trimmed)
    } else {
      isInitialized.value = false
    }
  }

  /**
   * Toggle tracking on/off
   */
  const toggleTracking = (enable: boolean) => {
    isTrackingEnabled.value = enable
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY_STORAGE_ENABLED, enable ? 'true' : 'false')
    }
  }

  /**
   * Send an immediate test event to verify Aptabase dashboard
   */
  const sendTestEvent = async () => {
    const dev = deviceInfo.value || (await loadDeviceInfo())
    await track('test_ping', {
      test: true,
      timestamp: new Date().toISOString(),
      device: `${dev.manufacturer} ${dev.model}`
    })
  }

  return {
    aptabaseAppKey,
    isInitialized,
    isTrackingEnabled,
    lastEventSent,
    deviceInfo,
    loadDeviceInfo,
    initAnalytics,
    track,
    setAppKey,
    toggleTracking,
    sendTestEvent
  }
}
