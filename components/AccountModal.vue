<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <div class="p-5 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 shadow-sm">
            <span v-if="userInitials" class="font-bold text-sm uppercase font-mono">
              {{ userInitials }}
            </span>
            <UIcon v-else name="i-lucide-user-check" class="w-5 h-5 text-emerald-400" />
            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900" />
          </div>

          <div class="min-w-0">
            <h2 class="text-base font-bold text-zinc-100 truncate">
              {{ authStore.user?.email || 'Аккаунт PARTPOCKET' }}
            </h2>
            <p class="text-xs text-zinc-400 truncate">
              Учетная запись склада
            </p>
          </div>
        </div>

        <button
          type="button"
          class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          @click="isOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-5 h-5" />
        </button>
      </div>

      <!-- License & Status Card -->
      <div class="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-zinc-400">Статус лицензии</span>
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
            :class="statusBadgeClasses"
          >
            <UIcon :name="authStore.statusBadge.icon" class="w-3.5 h-3.5" />
            <span>{{ authStore.statusBadge.label }}</span>
          </div>
        </div>

        <!-- Valid Until / Days Info -->
        <div class="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
          <span class="text-zinc-400">Действует до:</span>
          <span class="font-mono font-medium text-zinc-200">
            {{ formattedValidUntil }}
          </span>
        </div>

        <!-- Upgrade / Extend Button if Trial or Expired -->
        <div v-if="authStore.isTrial || authStore.isExpired" class="pt-2">
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            @click="handleOpenPaywall"
          >
            <UIcon name="i-lucide-sparkles" class="w-4 h-4 stroke-[2.5]" />
            <span>{{ authStore.isExpired ? 'Активировать PRO подписку' : 'Продлить / Перейти на PRO' }}</span>
          </button>
        </div>
      </div>

      <!-- Account Details Info -->
      <div class="space-y-2 text-xs">
        <!-- Email -->
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <div class="flex items-center gap-2 text-zinc-400">
            <UIcon name="i-lucide-mail" class="w-4 h-4 text-zinc-400" />
            <span>Email</span>
          </div>
          <span class="font-mono text-zinc-200 truncate max-w-[200px]">
            {{ authStore.user?.email || '—' }}
          </span>
        </div>

        <!-- Device ID -->
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <div class="flex items-center gap-2 text-zinc-400">
            <UIcon name="i-lucide-smartphone" class="w-4 h-4 text-zinc-400" />
            <span>Устройство</span>
          </div>
          <span class="font-mono text-[10px] text-zinc-400 truncate max-w-[180px]">
            {{ formatDeviceId(authStore.user?.device_id) }}
          </span>
        </div>
      </div>

      <!-- Logout Action -->
      <div class="pt-2 border-t border-zinc-800/60">
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-rose-500/10 active:scale-95 text-rose-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 transition-all font-semibold text-xs cursor-pointer shadow-sm"
          @click="handleLogout"
        >
          <UIcon name="i-lucide-log-out" class="w-4 h-4 stroke-[2]" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const toast = useToast()

const isOpen = computed({
  get: () => authStore.isAccountModalOpen,
  set: (val: boolean) => {
    authStore.isAccountModalOpen = val
  }
})

const userInitials = computed(() => {
  const email = authStore.user?.email || ''
  if (!email) return ''
  return email.slice(0, 2).toUpperCase()
})

const formattedValidUntil = computed(() => {
  if (!authStore.user?.valid_until) {
    return authStore.isPro ? 'Бессрочно' : 'Не указано'
  }
  const d = new Date(authStore.user.valid_until)
  if (isNaN(d.getTime())) return authStore.user.valid_until
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
})

const statusBadgeClasses = computed(() => {
  const color = authStore.statusBadge.color
  if (color === 'emerald') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  if (color === 'sky') return 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  if (color === 'amber') return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
})

function formatDeviceId(id?: string): string {
  if (!id) return 'Привязано'
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

function handleOpenPaywall() {
  authStore.closeAccountModal()
  authStore.openPaywall()
}

function handleLogout() {
  authStore.logout()
  authStore.closeAccountModal()
  toast.add({
    title: 'Выход выполнен',
    description: 'Вы вышли из учетной записи PARTPOCKET',
    color: 'gray',
    icon: 'i-lucide-log-out'
  })
}
</script>
