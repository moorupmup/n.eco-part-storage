<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md md:max-w-lg' }">
    <div class="p-5 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
      <!-- Modal Header -->
      <div class="text-center space-y-2 pt-1">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40">
          <UIcon name="i-lucide-crown" class="w-7 h-7 stroke-[2.2]" />
        </div>
        <div>
          <h2 class="text-lg font-black text-zinc-100 tracking-tight">
            {{ isExpired ? 'Пробный период завершён' : 'Переход на PRO версию' }}
          </h2>
          <p class="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
            {{ isExpired
              ? 'Ваш 30-дневный бесплатный доступ подошёл к концу. Все данные каталога и остатков в полной сохранности.'
              : 'Оформите постоянную лицензию для неограниченного учета склада автозапчастей.'
            }}
          </p>
        </div>
      </div>

      <!-- Feature Highlights -->
      <div class="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 text-xs">
        <div class="flex items-center gap-2.5 text-zinc-300">
          <div class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-check" class="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>Неограниченный приход и списание деталей (+ / -)</span>
        </div>

        <div class="flex items-center gap-2.5 text-zinc-300">
          <div class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-check" class="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>Раздельный учёт Новых и Б/У запчастей</span>
        </div>

        <div class="flex items-center gap-2.5 text-zinc-300">
          <div class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-check" class="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>Экспорт дефицита, остатков и истории в Excel</span>
        </div>

        <div class="flex items-center gap-2.5 text-zinc-300">
          <div class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-check" class="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span>Встроенное резервное копирование и автообновления</span>
        </div>
      </div>

      <!-- Safe data banner -->
      <div class="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-2.5 text-xs text-sky-300">
        <UIcon name="i-lucide-shield-check" class="w-4 h-4 shrink-0 text-sky-400" />
        <span class="text-[11px] leading-snug">
          Вы всегда можете экспортировать каталог и историю в Excel даже в бесплатном режиме.
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-2">
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-[0.98] text-zinc-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          @click="handleContact"
        >
          <UIcon name="i-lucide-credit-card" class="w-4 h-4 stroke-[2.5]" />
          <span>Оформить продление лицензии</span>
        </button>

        <button
          type="button"
          class="w-full py-2.5 px-4 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-800/60 transition-colors"
          @click="isOpen = false"
        >
          Продолжить в режиме просмотра (Read-Only)
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
  get: () => authStore.isPaywallModalOpen,
  set: (val: boolean) => {
    authStore.isPaywallModalOpen = val
  }
})

const isExpired = computed(() => authStore.isExpired)

function handleContact() {
  // You can link to your payment page, telegram bot or phone number
  const email = authStore.user?.email || 'клиент'
  const subject = encodeURIComponent(`Продление подписки PARTPOCKET (${email})`)
  window.open(`mailto:pumpuroom@gmail.com?subject=${subject}`, '_blank')
  toast.add({
    title: 'Запрос на продление',
    description: 'Для оплаты и продления подписки свяжитесь с поддержкой.',
    color: 'amber',
    icon: 'i-lucide-mail'
  })
}
</script>
