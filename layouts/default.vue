<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-primary-500/30 selection:text-primary-300">
    <!-- Main content area -->
    <main class="flex-1 pb-24 max-w-lg w-full mx-auto">
      <slot />
    </main>

    <!-- Fixed Mobile Bottom Navigation -->
    <AppBottomNav />

    <!-- Global Nuxt UI Notifications/Toasts -->
    <UNotifications />
  </div>
</template>

<script setup lang="ts">
import { usePartsStore } from '~/stores/parts'

const partsStore = usePartsStore()

// Initialize store and database on app start
onMounted(async () => {
  await partsStore.fetchParts()
})
</script>
