<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <div class="p-5 sm:p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
      <!-- Modal Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UIcon :name="mode === 'login' ? 'i-lucide-log-in' : 'i-lucide-user-plus'" class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-zinc-100">
              {{ mode === 'login' ? 'Вход в аккаунт' : 'Регистрация' }}
            </h2>
            <p class="text-xs text-zinc-400">
              {{ mode === 'login' ? 'Синхронизация лицензии склада' : 'Создайте аккаунт и начните учет' }}
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

      <!-- Mode Selector Tabs -->
      <div class="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold">
        <button
          type="button"
          class="py-2 rounded-lg transition-all text-center"
          :class="mode === 'login' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="mode = 'login'; error = ''"
        >
          Вход
        </button>
        <button
          type="button"
          class="py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5"
          :class="mode === 'register' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="mode = 'register'; error = ''"
        >
          <span>Регистрация</span>
          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            30 дней
          </span>
        </button>
      </div>

      <!-- Free Trial Banner (Visible on Register) -->
      <div
        v-if="mode === 'register'"
        class="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-start gap-2.5"
      >
        <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div class="text-xs">
          <p class="font-bold text-emerald-300">
            30 дней бесплатно без ограничений
          </p>
          <p class="text-zinc-400 text-[11px] mt-0.5 leading-snug">
            Все функции учета запчастей, приходов и списаний активируются сразу после создания аккаунта.
          </p>
        </div>
      </div>

      <!-- Error message -->
      <div
        v-if="error"
        class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2"
      >
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 text-rose-400" />
        <span>{{ error }}</span>
      </div>

      <!-- Form -->
      <form class="space-y-3" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'" class="space-y-1">
          <label class="text-[11px] font-semibold text-zinc-300">Ваше имя или название склада</label>
          <UInput
            v-model="form.name"
            placeholder="Склад АвтоЗапчасти"
            icon="i-lucide-building"
            color="gray"
            size="md"
          />
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-semibold text-zinc-300">Электронная почта (Email) *</label>
          <UInput
            v-model="form.email"
            type="email"
            required
            placeholder="sklad@example.com"
            icon="i-lucide-mail"
            color="gray"
            size="md"
          />
        </div>

        <div class="space-y-1">
          <label class="text-[11px] font-semibold text-zinc-300">Пароль *</label>
          <UInput
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            minlength="8"
            placeholder="Минимум 8 символов"
            icon="i-lucide-key"
            color="gray"
            size="md"
            :ui="{ icon: { trailing: { pointer: '' } } }"
          >
            <template #trailing>
              <UButton
                color="gray"
                variant="link"
                size="xs"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :padded="false"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <UIcon
              v-if="authStore.isLoading"
              name="i-lucide-loader-2"
              class="w-4 h-4 animate-spin"
            />
            <UIcon
              v-else
              :name="mode === 'login' ? 'i-lucide-log-in' : 'i-lucide-sparkles'"
              class="w-4 h-4 stroke-[2.5]"
            />
            <span>
              {{ authStore.isLoading ? 'Обработка...' : (mode === 'login' ? 'Войти' : 'Создать аккаунт и начать триал') }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const toast = useToast()

const isOpen = computed({
  get: () => authStore.isAuthModalOpen,
  set: (val: boolean) => {
    authStore.isAuthModalOpen = val
  }
})

const mode = ref<'login' | 'register'>('login')
const showPassword = ref(false)
const error = ref('')

const form = ref({
  name: '',
  email: '',
  password: ''
})

async function handleSubmit() {
  error.value = ''
  try {
    if (mode.value === 'register') {
      await authStore.register({
        email: form.value.email,
        password: form.value.password,
        name: form.value.name
      })
      toast.add({
        title: 'Регистрация успешна!',
        description: 'Вам активирован бесплатный доступ на 30 дней.',
        color: 'emerald',
        icon: 'i-lucide-sparkles'
      })
    } else {
      await authStore.login(form.value.email, form.value.password)
      toast.add({
        title: 'Вход выполнен',
        description: `Добро пожаловать, ${authStore.user?.email}`,
        color: 'emerald',
        icon: 'i-lucide-check'
      })
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка выполнения запроса'
  }
}
</script>
