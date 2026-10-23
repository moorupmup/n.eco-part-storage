<template>
  <div v-if="shouldShow" class="px-4 sm:px-6 md:px-8 py-2">
    <!-- Not Logged In Banner -->
    <div
      v-if="!authStore.isAuthenticated"
      class="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-sparkles" class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold text-emerald-300 truncate">
            Бесплатный доступ на 30 дней
          </p>
          <p class="text-[11px] text-zinc-400 truncate">
            Зарегистрируйтесь для синхронизации и полного доступа к складу
          </p>
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] transition-all active:scale-95 shadow-md shadow-emerald-500/20"
        @click="authStore.openAuthModal()"
      >
        Войти / Регистрация
      </button>
    </div>

    <!-- Expired (Read-Only) Banner -->
    <div
      v-else-if="authStore.isExpired"
      class="p-3 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-transparent border border-rose-500/30 flex items-center justify-between gap-3 shadow-sm"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-lock" class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold text-rose-300 truncate">
            Пробный период завершён (Режим чтения)
          </p>
          <p class="text-[11px] text-zinc-400 truncate">
            Для списания и добавления деталей оформите подписку PRO
          </p>
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] transition-all active:scale-95 shadow-md shadow-rose-500/20"
        @click="authStore.openPaywall()"
      >
        Купить PRO
      </button>
    </div>

    <!-- Trial Expiring Soon (<= 5 days) -->
    <div
      v-else-if="authStore.isTrial && authStore.daysRemaining <= 5"
      class="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-3 shadow-sm"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-clock" class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <p class="text-xs font-bold text-amber-300 truncate">
            Осталось {{ authStore.daysRemaining }} дн. пробного периода
          </p>
          <p class="text-[11px] text-zinc-400 truncate">
            Продлите доступ заранее, чтобы не прерывать складской учёт
          </p>
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-[11px] transition-all active:scale-95"
        @click="authStore.openPaywall()"
      >
        Продлить PRO
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()

const shouldShow = computed(() => {
  if (!authStore.isAuthenticated) return true
  if (authStore.isExpired) return true
  if (authStore.isTrial && authStore.daysRemaining <= 5) return true
  return false
})
</script>
