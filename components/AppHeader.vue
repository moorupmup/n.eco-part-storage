<template>
  <header class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 pt-safe transition-colors">
    <div class="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- App Icon Badge -->
        <div class="flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/30 shadow-sm shadow-emerald-950/50 shrink-0 bg-zinc-900 p-1">
          <img src="/icon.png" alt="N.ECO" class="w-full h-full object-contain" />
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
