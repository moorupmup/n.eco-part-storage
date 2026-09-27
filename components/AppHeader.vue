<template>
  <header class="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 pt-safe transition-colors">
    <div class="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
      <div class="flex items-center gap-2.5">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400">
          <UIcon name="i-lucide-wrench" class="w-4 h-4" />
        </div>
        <div>
          <h1 class="text-sm font-bold text-zinc-100 leading-none">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="text-[11px] text-zinc-400 mt-0.5 leading-none">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
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
