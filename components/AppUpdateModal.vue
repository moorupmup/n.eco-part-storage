<template>
  <UModal v-model="isUpdateModalOpen" :ui="{ width: 'sm:max-w-md' }">
    <div
      class="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl"
      :style="sheetStyle"
    >
      <!-- Drag handle (disabled during active download) -->
      <ModalDragHandle
        v-if="!isDownloading"
        class="-mt-2 mb-1"
        @pointerdown="onPointerDown"
      />
      <div v-else class="h-2" />

      <!-- Header -->
      <div
        class="flex items-start gap-3 mb-3.5"
        :class="!isDownloading ? 'cursor-grab active:cursor-grabbing touch-none select-none' : ''"
        @pointerdown="!isDownloading ? onPointerDown($event) : null"
      >
        <div class="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <UIcon name="i-lucide-sparkles" class="w-6 h-6 stroke-[2]" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <h3 class="text-base font-bold text-zinc-100">Доступно обновление</h3>
            <span class="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NEW
            </span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-zinc-400">
            <span class="font-mono text-zinc-500">{{ currentVersion }}</span>
            <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5 text-zinc-600" />
            <span class="font-mono font-bold text-emerald-400">{{ latestRelease?.tag_name || 'новая версия' }}</span>
          </div>
        </div>
      </div>

      <!-- Release metadata (Date & Size) -->
      <div class="flex items-center gap-4 text-[11px] text-zinc-400 mb-3.5 px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
        <span v-if="latestRelease?.published_at" class="flex items-center gap-1.5">
          <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-zinc-500" />
          {{ formatDate(latestRelease.published_at) }}
        </span>
        <span v-if="apkAsset?.size" class="flex items-center gap-1.5">
          <UIcon name="i-lucide-hard-drive" class="w-3.5 h-3.5 text-zinc-500" />
          {{ formatBytes(apkAsset.size) }}
        </span>
      </div>

      <!-- Release notes / Changelog -->
      <div v-if="latestRelease?.body" class="mb-4">
        <div class="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1">
          <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-emerald-400" />
          <span>Что нового в этой версии:</span>
        </div>
        <div class="max-h-36 overflow-y-auto overscroll-contain p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed select-text no-scrollbar">
          {{ latestRelease.body }}
        </div>
      </div>

      <!-- Download progress bar -->
      <div v-if="isDownloading" class="space-y-2 mb-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
        <div class="flex items-center justify-between text-xs">
          <span class="text-zinc-300 font-medium flex items-center gap-2">
            <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-emerald-400" />
            <span>{{ downloadStatus || 'Загрузка...' }}</span>
          </span>
          <span class="font-mono font-bold text-emerald-400">{{ downloadProgress }}%</span>
        </div>
        <div class="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
          <div
            class="bg-emerald-500 h-full transition-all duration-200 rounded-full shadow-sm shadow-emerald-500/50"
            :style="{ width: `${downloadProgress}%` }"
          />
        </div>
      </div>

      <!-- Install Error Alert -->
      <div v-if="installError" class="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
        <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <div class="flex-1">
          <div>{{ installError }}</div>
          <a
            v-if="apkDownloadUrl"
            :href="apkDownloadUrl"
            target="_blank"
            class="mt-1.5 text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
          >
            <UIcon name="i-lucide-external-link" class="w-3 h-3" />
            <span>Скачать APK через браузер</span>
          </a>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2.5 pt-1">
        <button
          v-if="!isDownloading"
          type="button"
          class="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 font-semibold text-sm transition-all"
          @click="dismissUpdate"
        >
          Позже
        </button>

        <button
          type="button"
          :disabled="isDownloading"
          class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
          @click="handleUpdateClick"
        >
          <UIcon v-if="isDownloading" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
          <UIcon v-else name="i-lucide-download" class="w-4 h-4 stroke-[2.5]" />
          <span>{{ isDownloading ? 'Загрузка...' : 'Обновить сейчас' }}</span>
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { useAppUpdater } from '~/composables/useAppUpdater'
import { useSwipeDismiss } from '~/composables/useSwipeDismiss'

const {
  currentVersion,
  latestRelease,
  apkAsset,
  apkDownloadUrl,
  isDownloading,
  downloadProgress,
  downloadStatus,
  installError,
  downloadAndInstall,
  dismissUpdate,
  formatDate,
  formatBytes,
  isUpdateModalOpen
} = useAppUpdater()

const haptics = useHaptics()

const { sheetStyle, onPointerDown } = useSwipeDismiss({
  onDismiss: () => {
    if (!isDownloading.value) {
      dismissUpdate()
    }
  },
  isOpen: isUpdateModalOpen
})

function handleUpdateClick() {
  haptics.lightTap()
  downloadAndInstall()
}
</script>
