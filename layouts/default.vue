<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-primary-500/30 selection:text-primary-300">
    <!-- Main content area -->
    <main class="flex-1 pb-24 md:pb-28 max-w-7xl w-full mx-auto px-0 sm:px-2 md:px-4 transition-all">
      <slot />
    </main>

    <!-- Fixed Mobile Bottom Navigation -->
    <AppBottomNav />

    <!-- Global Nuxt UI Notifications/Toasts -->
    <UNotifications />

    <!-- Automatic App Update Modal -->
    <AppUpdateModal />
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { usePartsStore } from '~/stores/parts'
import { useAppUpdater } from '~/composables/useAppUpdater'

const partsStore = usePartsStore()
const { checkForUpdates } = useAppUpdater()

// Initialize store and database on app start
onMounted(async () => {
  await partsStore.fetchParts()

  // On phone (native Capacitor or mobile browser): check for updates automatically on start
  const isMobile = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent))
  if (isMobile) {
    setTimeout(async () => {
      await checkForUpdates(false)
    }, 1500)
  }
})
</script>
