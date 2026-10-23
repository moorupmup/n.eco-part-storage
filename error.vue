<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center select-none">
    <div class="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/40">
      <UIcon name="i-lucide-alert-triangle" class="w-8 h-8" />
    </div>

    <h1 class="text-lg font-black text-zinc-100 tracking-tight mb-1">
      Произошла непредвиденная ошибка
    </h1>
    <p class="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
      {{ error?.message || 'Приложение столкнулось с внутренней ошибкой. Нажмите кнопку ниже, чтобы перезагрузить интерфейс.' }}
    </p>

    <div class="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
      <button
        type="button"
        class="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
        @click="handleClearError"
      >
        Перезагрузить склад
      </button>

      <button
        type="button"
        class="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 font-semibold text-xs transition-all cursor-pointer"
        @click="handleHardReset"
      >
        Сбросить кэш и обновить
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  error: any
}>()

function handleClearError() {
  clearError({ redirect: '/' })
}

function handleHardReset() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('neco_installed_update_tag')
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }
}
</script>
