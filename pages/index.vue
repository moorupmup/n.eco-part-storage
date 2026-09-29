<template>
  <div>
    <!-- Top Header -->
    <AppHeader title="N.ECO PART STORAGE" :subtitle="`${partsStore.stats.totalPositions} позиций · Новые: ${partsStore.stats.totalNewQuantity} · Б/У: ${partsStore.stats.totalUsedQuantity}`">
      <template #actions>
        <button
          type="button"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 active:scale-95 transition-all shadow-sm"
          :class="{ 'opacity-50 pointer-events-none': partsStore.isLoading }"
          title="Обновить список"
          @click="refreshData"
        >
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" :class="{ 'animate-spin': partsStore.isLoading }" />
        </button>

        <NuxtLink
          to="/settings"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 active:scale-95 transition-all shadow-sm"
          title="Обновление приложения"
        >
          <UIcon name="i-lucide-settings" class="w-4 h-4" />
        </NuxtLink>
      </template>
    </AppHeader>

    <div class="px-4 py-3 space-y-3">
      <!-- Quick Search Bar (Dark Theme) -->
      <div class="relative">
        <div class="relative flex items-center">
          <UIcon name="i-lucide-search" class="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            v-model="partsStore.searchQuery"
            type="text"
            placeholder="Поиск детали (помпа, жернова, клапан, артикул)..."
            class="w-full h-11 pl-10 pr-10 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors shadow-inner"
          />
          <button
            v-if="partsStore.searchQuery"
            type="button"
            class="absolute right-3 p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="partsStore.searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Horizontal Stock Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="filter in stockFilters"
          :key="filter.id"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border shrink-0 transition-colors active:scale-95"
          :class="partsStore.stockFilter === filter.id ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm' : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'"
          @click="partsStore.stockFilter = filter.id"
        >
          <span>{{ filter.label }}</span>
          <span
            v-if="filter.count !== undefined"
            class="text-[11px] font-mono tabular-nums transition-colors"
            :class="partsStore.stockFilter === filter.id ? 'text-emerald-300/70' : 'text-zinc-500'"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Categories Pills (if categories exist) -->
      <div v-if="partsStore.categories.length > 0" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border shrink-0 transition-colors"
          :class="partsStore.selectedCategory === 'all'
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="partsStore.selectedCategory = 'all'"
        >
          <span>Все категории</span>
          <span
            class="text-[10px] font-mono tabular-nums transition-colors"
            :class="partsStore.selectedCategory === 'all' ? 'text-zinc-400' : 'text-zinc-600'"
          >
            {{ partsStore.parts.length }}
          </span>
        </button>
        <button
          v-for="cat in partsStore.categories"
          :key="cat"
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border shrink-0 transition-colors"
          :class="partsStore.selectedCategory === cat
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="partsStore.selectedCategory = cat"
        >
          <span>{{ cat }}</span>
          <span
            class="text-[10px] font-mono tabular-nums transition-colors"
            :class="partsStore.selectedCategory === cat ? 'text-zinc-400' : 'text-zinc-600'"
          >
            {{ categoryCountMap[cat] || 0 }}
          </span>
        </button>
        <NuxtLink
          to="/categories"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
          title="Управление категориями"
        >
          <UIcon name="i-lucide-folder-cog" class="w-3 h-3 text-emerald-400" />
          <span>Настроить</span>
        </NuxtLink>
      </div>

      <!-- Parts List -->
      <div
        v-if="partsStore.filteredParts.length > 0"
        :key="`${partsStore.selectedCategory}-${partsStore.stockFilter}`"
        class="space-y-2.5 pt-1"
      >
        <PartCard
          v-for="(part, index) in partsStore.filteredParts"
          :key="part.id"
          :part="part"
          class="card-enter"
          :style="{ '--enter-delay': `${Math.min(index * 45, 320)}ms` }"
          @action="openStockModal"
          @edit="openEditModal"
          @delete="confirmDeletePart"
        />
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl mt-4"
      >
        <div class="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-500 mb-3">
          <UIcon name="i-lucide-package-search" class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-zinc-200 mb-1">
          Ничего не найдено
        </h3>
        <p class="text-xs text-zinc-400 mb-4 max-w-xs">
          {{ partsStore.searchQuery ? 'Попробуйте изменить поисковый запрос или сбросить фильтры' : 'В каталоге пока нет запчастей. Нажмите кнопку ниже, чтобы добавить первую позицию.' }}
        </p>
        <UButton
          v-if="!partsStore.searchQuery"
          color="primary"
          icon="i-lucide-plus"
          label="Добавить запчасть"
          size="sm"
          @click="openAddModal"
        />
      </div>
    </div>

    <!-- Floating Action Button (FAB) to Add Part -->
    <div class="fixed right-4 bottom-20 z-30">
      <button
        type="button"
        class="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-xl shadow-emerald-500/30 active:scale-90 transition-all focus:outline-none"
        @click="openAddModal"
      >
        <UIcon name="i-lucide-plus" class="w-7 h-7 stroke-[2.5]" />
      </button>
    </div>

    <!-- Stock In/Out Modal -->
    <StockActionModal
      v-model="isStockModalOpen"
      :part="selectedPart"
      :initial-type="actionType"
      @success="handleMovementSuccess"
    />

    <!-- Add / Edit Part Modal -->
    <PartModal
      v-model="isPartModalOpen"
      :part-to-edit="partToEdit"
      @saved="handlePartSaved"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteConfirmOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div class="flex items-center gap-3 mb-3 text-rose-400">
          <div class="p-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <UIcon name="i-lucide-alert-triangle" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-100">Удалить запчасть?</h3>
            <p class="text-xs text-zinc-400">Это действие нельзя отменить</p>
          </div>
        </div>

        <p class="text-sm text-zinc-300 mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
          Вы действительно хотите удалить <strong>{{ partToDelete?.name }}</strong> и всю связанную историю операций?
        </p>

        <div class="flex items-center gap-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isDeleteConfirmOpen = false"
          />
          <UButton
            color="rose"
            variant="solid"
            label="Удалить"
            block
            class="flex-1 font-bold"
            @click="executeDelete"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Part, MovementType } from '~/types'
import { usePartsStore } from '~/stores/parts'

const partsStore = usePartsStore()
const toast = useToast()

const categoryCountMap = computed(() => {
  const map: Record<string, number> = {}
  for (const p of partsStore.parts) {
    if (p && p.category) {
      const cat = p.category.trim()
      map[cat] = (map[cat] || 0) + 1
      if (p.category !== cat) {
        map[p.category] = (map[p.category] || 0) + 1
      }
    }
  }
  return map
})

const stockFilters = computed(() => {
  let pool = partsStore.parts || []
  if (partsStore.selectedCategory !== 'all') {
    pool = pool.filter(p => p && p.category === partsStore.selectedCategory)
  }
  if (partsStore.searchQuery.trim()) {
    const q = partsStore.searchQuery.toLowerCase().trim()
    pool = pool.filter(p =>
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    )
  }

  const allCount = pool.length
  const inStockCount = pool.filter(p => ((p.stock_new || 0) + (p.stock_used || 0)) > 0).length
  const outCount = pool.filter(p => ((p.stock_new || 0) + (p.stock_used || 0)) === 0).length

  return [
    { id: 'all', label: 'Все', count: allCount },
    { id: 'in_stock', label: 'В наличии', count: inStockCount },
    { id: 'out', label: 'Закончились', count: outCount }
  ]
})

// Modal states
const isStockModalOpen = ref(false)
const selectedPart = ref<Part | null>(null)
const actionType = ref<MovementType>('IN')

const isPartModalOpen = ref(false)
const partToEdit = ref<Part | null>(null)

const isDeleteConfirmOpen = ref(false)
const partToDelete = ref<Part | null>(null)

function openStockModal({ part, type }: { part: Part; type: MovementType }) {
  selectedPart.value = part
  actionType.value = type
  isStockModalOpen.value = true
}

function openAddModal() {
  partToEdit.value = null
  isPartModalOpen.value = true
}

function openEditModal(part: Part) {
  partToEdit.value = part
  isPartModalOpen.value = true
}

function confirmDeletePart(part: Part) {
  partToDelete.value = part
  isDeleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!partToDelete.value) return
  try {
    const name = partToDelete.value.name
    await partsStore.deletePart(partToDelete.value.id)
    toast.add({
      title: 'Удалено',
      description: name,
      color: 'gray'
    })
    isDeleteConfirmOpen.value = false
  } catch (err: any) {
    toast.add({
      title: 'Ошибка удаления',
      description: err.message,
      color: 'red'
    })
  }
}

async function refreshData() {
  await partsStore.fetchParts()
}

async function handlePartSaved(savedPart?: Part) {
  const isCreating = !partToEdit.value
  await partsStore.fetchParts()
  if (isCreating && savedPart?.id) {
    navigateTo(`/part/${savedPart.id}`)
  }
}

function handleMovementSuccess() {
  // Handled inside component and store
}
</script>

<style scoped>
@keyframes partCardFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card-enter {
  animation: partCardFadeIn 240ms ease-out var(--enter-delay, 0ms) both;
}

@media (prefers-reduced-motion: reduce) {
  .card-enter {
    animation: none !important;
    opacity: 1 !important;
  }
}
</style>
