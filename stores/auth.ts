import { defineStore } from 'pinia'
import { Device } from '@capacitor/device'
import { usePocketBase } from '~/composables/usePocketBase'

export interface UserProfile {
  id: string
  email: string
  name?: string
  company_name?: string
  device_id?: string
  valid_until?: string
  license_status?: 'trial' | 'active' | 'expired'
  created?: string
  updated?: string
}

interface AuthState {
  user: UserProfile | null
  token: string
  isLoading: boolean
  isInitialized: boolean
  isAuthModalOpen: boolean
  isPaywallModalOpen: boolean
  timeTampered: boolean
}

function parsePocketBaseError(err: any, defaultMsg: string): string {
  if (!err) return defaultMsg
  // Network blocked or server unreachable (Android cleartext or offline)
  if (err.status === 0 || err.isAbort) {
    return 'Нет связи с сервером (HTTP заблокирован Android или нет интернета). Установите обновленный APK v1.1.3.'
  }
  // Field validation errors
  if (err.data?.data && typeof err.data.data === 'object') {
    const details: string[] = []
    for (const [field, val] of Object.entries<any>(err.data.data)) {
      if (val?.message) {
        details.push(`${field}: ${val.message}`)
      }
    }
    if (details.length > 0) {
      return details.join('; ')
    }
  }
  return err.data?.message || err.message || defaultMsg
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: '',
    isLoading: false,
    isInitialized: false,
    isAuthModalOpen: false,
    isPaywallModalOpen: false,
    timeTampered: false
  }),

  getters: {
    isAuthenticated: (state): boolean => {
      return Boolean(state.user && state.token)
    },

    validUntilDate: (state): Date | null => {
      if (!state.user?.valid_until) return null
      const d = new Date(state.user.valid_until)
      return isNaN(d.getTime()) ? null : d
    },

    isExpired(): boolean {
      if (!this.isAuthenticated) return true
      if (this.timeTampered) return true

      // Lifetime or explicitly active without limit
      if (this.user?.license_status === 'active' && !this.user.valid_until) {
        return false
      }

      if (!this.validUntilDate) return true
      return Date.now() > this.validUntilDate.getTime()
    },

    isReadOnly(): boolean {
      return !this.isAuthenticated || this.isExpired
    },

    daysRemaining(): number {
      if (!this.validUntilDate) return 0
      const diff = this.validUntilDate.getTime() - Date.now()
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    },

    isTrial(): boolean {
      return this.user?.license_status === 'trial'
    },

    isPro(): boolean {
      return this.user?.license_status === 'active'
    },

    statusBadge(): { label: string; color: 'emerald' | 'sky' | 'amber' | 'rose' | 'gray'; icon: string } {
      if (!this.isAuthenticated) {
        return { label: 'Вход не выполнен', color: 'rose', icon: 'i-lucide-user-x' }
      }
      if (this.timeTampered) {
        return { label: 'Сбой времени системы', color: 'rose', icon: 'i-lucide-clock-alert' }
      }
      if (this.isPro && !this.isExpired) {
        return { label: 'Лицензия PRO', color: 'emerald', icon: 'i-lucide-badge-check' }
      }
      if (this.isTrial && !this.isExpired) {
        const days = this.daysRemaining
        return {
          label: `Триал (${days} дн.)`,
          color: days > 5 ? 'sky' : 'amber',
          icon: 'i-lucide-sparkles'
        }
      }
      return { label: 'Доступ истёк', color: 'rose', icon: 'i-lucide-lock' }
    }
  },

  actions: {
    async init() {
      if (this.isInitialized) return
      const pb = usePocketBase()

      // 1. Time tampering check (anti-cheat)
      if (typeof localStorage !== 'undefined') {
        const lastSeen = Number(localStorage.getItem('neco_last_seen_ts') || '0')
        const now = Date.now()
        // If system time rolled back more than 2 hours
        if (lastSeen && now < lastSeen - 7200000) {
          this.timeTampered = true
        } else {
          localStorage.setItem('neco_last_seen_ts', String(now))
        }
      }

      // 2. Restore cached user from PocketBase local storage
      if (pb.authStore.isValid && pb.authStore.record) {
        this.token = pb.authStore.token
        this.user = { ...(pb.authStore.record as any) }
      }

      this.isInitialized = true

      // 3. Background server refresh if online
      if (this.isAuthenticated && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const authData = await pb.collection('users').authRefresh()
          this.token = authData.token
          this.user = { ...(authData.record as any) }
        } catch (err: any) {
          if (err.status === 401 || err.status === 403) {
            this.logout()
          }
        }
      }
    },

    async getDeviceId(): Promise<string> {
      try {
        const info = await Device.getId()
        return info.identifier || 'web-client'
      } catch {
        return 'web-client'
      }
    },

    async register(payload: { email: string; password: string; name?: string; company_name?: string }) {
      this.isLoading = true
      const pb = usePocketBase()

      try {
        const deviceId = await this.getDeviceId()
        const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

        await pb.collection('users').create({
          email: payload.email.trim().toLowerCase(),
          password: payload.password,
          passwordConfirm: payload.password,
          name: payload.name?.trim() || '',
          company_name: payload.company_name?.trim() || '',
          device_id: deviceId,
          valid_until: trialEndDate,
          license_status: 'trial'
        })

        // Auto login right after registration
        await this.login(payload.email, payload.password)
        this.isAuthModalOpen = false
      } catch (err: any) {
        const message = parsePocketBaseError(err, 'Ошибка при регистрации')
        throw new Error(message)
      } finally {
        this.isLoading = false
      }
    },

    async login(email: string, pass: string) {
      this.isLoading = true
      const pb = usePocketBase()

      try {
        const authData = await pb.collection('users').authWithPassword(
          email.trim().toLowerCase(),
          pass
        )

        this.token = authData.token
        this.user = { ...(authData.record as any) }
        this.isAuthModalOpen = false

        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('neco_last_seen_ts', String(Date.now()))
        }
      } catch (err: any) {
        const message = parsePocketBaseError(err, 'Неверный логин или пароль')
        throw new Error(message)
      } finally {
        this.isLoading = false
      }
    },

    logout() {
      const pb = usePocketBase()
      pb.authStore.clear()
      this.user = null
      this.token = ''
    },

    openAuthModal() {
      this.isAuthModalOpen = true
    },

    closeAuthModal() {
      this.isAuthModalOpen = false
    },

    openPaywall() {
      this.isPaywallModalOpen = true
    },

    closePaywall() {
      this.isPaywallModalOpen = false
    }
  }
})
