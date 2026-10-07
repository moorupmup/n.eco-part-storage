<template>
  <nav class="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 pb-safe md:bg-transparent md:border-t-0 md:pointer-events-none md:pb-4 transition-all">
    <div class="flex items-center justify-around h-16 max-w-lg md:max-w-xl mx-auto px-2 md:px-4 md:bg-zinc-900/95 md:backdrop-blur-xl md:border md:border-zinc-800/90 md:rounded-2xl md:shadow-2xl md:shadow-black/70 md:pointer-events-auto transition-all">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all duration-150 active:scale-95 md:hover:bg-zinc-800/40 md:rounded-xl"
        :class="route.path === tab.path ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'"
        @click="haptics.lightTap()"
      >
        <div class="relative">
          <UIcon :name="tab.icon" class="w-6 h-6 mb-0.5" />
          
          <!-- Badge counter for low stock -->
          <span
            v-if="tab.badge && tab.badge > 0"
            class="absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-600 rounded-full animate-pulse shadow-sm"
          >
            {{ tab.badge > 99 ? '99+' : tab.badge }}
          </span>
        </div>

        <span class="text-[11px] leading-tight tracking-tight">{{ tab.name }}</span>
        
        <!-- Active indicator bar -->
        <span
          v-if="route.path === tab.path"
          class="absolute bottom-1 w-6 h-0.5 rounded-full bg-emerald-400"
        />
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { usePartsStore } from '~/stores/parts'

const route = useRoute()
const partsStore = usePartsStore()
const haptics = useHaptics()

const tabs = computed(() => [
  {
    name: 'Каталог',
    path: '/',
    icon: 'i-lucide-boxes'
  },
  {
    name: 'Категории',
    path: '/categories',
    icon: 'i-lucide-folder-tree'
  },
  {
    name: 'История',
    path: '/history',
    icon: 'i-lucide-history'
  },
  {
    name: 'Бэкап',
    path: '/backup',
    icon: 'i-lucide-database'
  }
])
</script>
