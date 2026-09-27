<template>
  <div>
    <!-- Top Header -->
    <AppHeader title="Склад запчастей" :subtitle="`${partsStore.stats.totalPositions} позиций · Новые: ${partsStore.stats.totalNewQuantity} · Б/У: ${partsStore.stats.totalUsedQuantity}`">
      <template #actions>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-refresh-cw"
          size="sm"
          :loading="partsStore.isLoading"
          @click="refreshData"
        />
      </template>
    </AppHeader>

    <div class="px-4 py-3 space-y-3">
      <!-- Quick Search Bar -->
      <div class="relative">
        <UInput
          v-model="partsStore.searchQuery"
          icon="i-lucide-search"
          size="lg"
          placeholder="Поиск по артикулу, названию, ячейке..."
          :ui="{ icon: { trailing: { pointer: '' } } }"
          class="w-full shadow-sm"
        >
          <template #trailing>
            <UButton
              v-show="partsStore.searchQuery !== ''"
              color="gray"
              variant="link"
              icon="i-lucide-x"
              :padded="false"
              @click="partsStore.searchQuery = ''"
            />
          </template>
        </UInput>
      </div>

      <!-- Horizontal Stock Filter Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="filter in stockFilters"
          :key="filter.id"
          type="button"
          class="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all active:scale-95"
          :class="partsStore.stockFilter === filter.id ? 'bg-primary-500 text-white font-semibold shadow-sm' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'"
          @click="partsStore.stockFilter = filter.id"
        >
          <span>{{ filter.label }}</span>
          <span
            v-if="filter.count !== undefined"
            class="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px]"
            :class="partsStore.stockFilter === filter.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Categories Pills (if categories exist) -->
      <div v-if="partsStore.categories.length > 0" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          class="px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all"
          :class="partsStore.selectedCategory === 'all' ? 'bg-zinc-800 text-zinc-200 font-semibold' : 'text-zinc-500 hover:text-zinc-300'"
          @click="partsStore.selectedCategory = 'all'"
        >
          Все категории
        </button>
        <button
          v-for="cat in partsStore.categories"
          :key="cat"
          type="button"
          class="px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all"
          :class="partsStore.selectedCategory === cat ? 'bg-zinc-800 text-zinc-200 font-semibold border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'"
          @click="partsStore.selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Parts List -->
      <div v-if="partsStore.filteredParts.length > 0" class="space-y-2.5 pt-1">
        <PartCard
          v-for="part in partsStore.filteredParts"
          :key="part.id"
          :part="part"
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
        class="flex items-center justify-center w-14 h-14 rounded-full bg-primary-500 text-white shadow-xl shadow-primary-500/25 active:scale-90 transition-transform focus:outline-none"
        @click="openAddModal"
      >
        <UIcon name="i-lucide-plus" class="w-7 h-7" />
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
      @saved="refreshData"
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
          Вы действительно хотите удалить <strong>{{ partToDelete?.code }} — {{ partToDelete?.name }}</strong> и всю связанную историю операций?
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

const stockFilters = computed(() => [
  { id: 'all', label: 'Все' },
  { id: 'in_stock', label: 'В наличии' },
  { id: 'low', label: 'Мало', count: partsStore.stats.lowStockPositions },
  { id: 'out', label: 'Нет' }
])

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

function handleMovementSuccess() {
  // Handled inside component and store
}
</script>
