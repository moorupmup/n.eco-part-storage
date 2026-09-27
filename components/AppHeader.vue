<template>
  <header class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 pt-safe transition-colors">
    <div class="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- Warehouse Storage SVG Badge -->
        <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-950/50 shrink-0">
          <svg class="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Warehouse main structure -->
            <path d="M3 21V9.5L12 4L21 9.5V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Storage cargo door / shutter -->
            <path d="M8 21V12.5C8 12.22 8.22 12 8.5 12H15.5C15.78 12 16 12.22 16 12.5V21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <path d="M8 15H16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            <path d="M8 18H16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            <!-- Roof ventilation / crane beam -->
            <path d="M12 4V8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <div class="min-w-0">
          <h1 class="text-sm font-extrabold text-zinc-100 leading-none tracking-tight truncate">
            <slot name="title">
              <template v-if="title && title.includes('N.ECO')">
                <span class="text-emerald-400 font-black">N.ECO</span>{{ title.replace('N.ECO', '') }}
              </template>
              <template v-else>
                {{ title }}
              </template>
            </slot>
          </h1>
          <p v-if="subtitle" class="text-[11px] text-zinc-400 mt-1 leading-none truncate">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>
