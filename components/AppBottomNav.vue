<template>
  <nav class="fixed bottom-0 inset-x-0 z-40 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 pb-safe">
    <div class="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
      <NuxtLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-all duration-150 active:scale-95"
        :class="route.path === tab.path ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'"
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
