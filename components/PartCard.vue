<template>
  <div
    class="group relative bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 active:border-emerald-500/50 rounded-xl p-3 shadow-sm transition-all duration-150 cursor-pointer active:scale-[0.99] focus-within:z-30"
    @click="openDetail"
  >
    <!-- Top Row: Photo (top-aligned) + Info (Category, Menu, Name) -->
    <div class="flex items-start gap-3">
      <!-- Photo Thumbnail or Icon Placeholder (aligned to top, 80x80) -->
      <div class="relative w-20 h-20 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
        <img
          v-if="part.image"
          :src="part.image"
          :alt="part.name"
          class="w-full h-full object-cover"
          loading="lazy"
        />
        <div v-else class="flex flex-col items-center justify-center text-zinc-600">
          <UIcon name="i-lucide-package" class="w-8 h-8 stroke-[1.5]" />
        </div>
      </div>

      <!-- Info Block: Badges & Name -->
      <div class="flex-1 min-w-0">
        <!-- Badges row: only rendered if category or articles count is present -->
        <div
          v-if="hasTopBadges"
          class="flex items-center gap-1.5 flex-wrap mb-1.5"
        >
          <span
            v-if="showCategory"
            class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 truncate max-w-[140px]"
          >
            {{ part.category }}
          </span>

          <span
            v-if="showArticlesCount"
            class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 shrink-0"
          >
            {{ articlesCount }} арт.
          </span>
        </div>

        <!-- Part Name -->
        <h3
          class="text-sm font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug"
        >
          {{ part.name }}
        </h3>
      </div>

      <!-- Dropdown menu -->
      <div class="shrink-0 -mr-1 -mt-0.5" @click.stop>
        <UDropdown :items="menuItems" :popper="{ placement: 'bottom-end', strategy: 'absolute' }">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-more-vertical"
            size="xs"
            class="text-zinc-500 hover:text-zinc-200"
          />
        </UDropdown>
      </div>
    </div>

    <!-- Bottom Row: Full width Tags list -->
    <div
      v-if="displayTags.length > 0"
      class="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center overflow-x-auto no-scrollbar whitespace-nowrap text-xs leading-normal"
      @click.stop
    >
      <template v-for="(tag, idx) in displayTags" :key="tag">
        <button
          type="button"
          class="inline-flex items-center text-zinc-500 hover:text-emerald-400 active:opacity-75 transition-colors cursor-pointer shrink-0"
          :title="`Фильтровать по #${tag}`"
          @click.stop="filterByTag(tag)"
        >
          <span class="text-emerald-500/70 mr-1 font-mono">#</span><span>{{ tag }}</span>
        </button><span v-if="idx < displayTags.length - 1" class="text-zinc-600 mr-1.5 shrink-0">,</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Part } from '~/types'
import { parseTags } from '~/utils/tags'
import { usePartsStore } from '~/stores/parts'

const props = defineProps<{
  part: Part
}>()

const partsStore = usePartsStore()

const displayTags = computed(() => {
  if (props.part?.tags && props.part.tags.length > 0) {
    return props.part.tags
  }
  return parseTags(props.part?.notes)
})

const articlesCount = computed(() => props.part?.articles?.length || 1)
const showCategory = computed(() => !!props.part.category && partsStore.selectedCategory === 'all')
const showArticlesCount = computed(() => articlesCount.value > 1)
const hasTopBadges = computed(() => showCategory.value || showArticlesCount.value)

function openDetail() {
  navigateTo(`/part/${props.part.id}`)
}

function filterByTag(tag: string) {
  partsStore.searchQuery = tag
}

const emit = defineEmits<{
  (e: 'edit', part: Part): void
  (e: 'delete', part: Part): void
}>()

const menuItems = computed(() => [
  [
    {
      label: 'Открыть деталь',
      icon: 'i-lucide-external-link',
      click: () => openDetail()
    },
    {
      label: 'Редактировать',
      icon: 'i-lucide-pencil',
      click: () => emit('edit', props.part)
    },
    {
      label: 'Удалить',
      icon: 'i-lucide-trash-2',
      click: () => emit('delete', props.part)
    }
  ]
])
</script>
