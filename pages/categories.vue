<template>
  <div>
    <!-- Top Header -->
    <AppHeader
      title="Категории"
      :subtitle="`${partsStore.categoriesWithStats.length} категорий деталей`"
    >
      <template #actions>
        <button
          type="button"
          class="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 active:scale-95 transition-all shadow-sm"
          title="Обновить"
          @click="refreshData"
        >
          <UIcon name="i-lucide-refresh-cw" class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" />
        </button>
      </template>
    </AppHeader>

    <div class="px-4 py-3 space-y-4">
      <!-- Add New Category Card -->
      <div class="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm overflow-hidden">
        <label class="block text-xs font-bold text-zinc-300 mb-2 flex items-center gap-1.5">
          <UIcon name="i-lucide-plus-circle" class="w-4 h-4 text-emerald-400" />
          Добавить новую категорию / узел
        </label>
        <form @submit.prevent="handleAddCategory" class="flex items-center gap-2 w-full">
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="Например: Капучинаторы, Редукторы..."
            maxlength="50"
            class="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
          <button
            type="submit"
            :disabled="!newCategoryName.trim() || isSubmitting"
            class="h-11 px-3.5 sm:px-4 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
          >
            <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <UIcon v-else name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
            <span>Добавить</span>
          </button>
        </form>
      </div>

      <!-- Quick Search Bar (if categories exist) -->
      <div v-if="partsStore.categoriesWithStats.length > 4" class="relative">
        <UIcon name="i-lucide-search" class="absolute left-3.5 top-3 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по категориям..."
          class="w-full h-10 pl-10 pr-10 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors shadow-inner"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-3 top-2.5 p-0.5 rounded-full text-zinc-500 hover:text-zinc-300"
          @click="searchQuery = ''"
        >
          <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Categories List -->
      <div v-if="filteredCategories.length > 0" class="space-y-2.5">
        <div
          v-for="cat in filteredCategories"
          :key="cat.id"
          class="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 shadow-sm hover:border-zinc-700/80 transition-colors"
        >
          <!-- Top Row: Icon + Name + Action buttons -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                <UIcon name="i-lucide-folder" class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <h3 class="text-sm font-bold text-zinc-100 truncate">
                  {{ cat.name }}
                </h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    class="text-[11px] font-mono px-2 py-0.2 rounded-md font-semibold"
                    :class="cat.partsCount > 0 ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'"
                  >
                    {{ cat.partsCount }} {{ getPartsWord(cat.partsCount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Action buttons: Edit & Delete -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 active:scale-90 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 transition-all"
                title="Переименовать категорию"
                @click="openEditModal(cat)"
              >
                <UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                class="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-rose-950/40 active:scale-90 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 hover:border-rose-500/30 transition-all"
                title="Удалить категорию"
                @click="confirmDelete(cat)"
              >
                <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Stock Breakdown & View button -->
          <div class="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
            <div class="text-[11px] text-zinc-400">
              В рюкзаке: <strong class="text-zinc-200 font-mono">{{ cat.totalNew + cat.totalUsed }} шт</strong>
              <span class="text-zinc-500 ml-1">(нов: {{ cat.totalNew }}, б/у: {{ cat.totalUsed }})</span>
            </div>

            <button
              v-if="cat.partsCount > 0"
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              @click="goToCatalog(cat.name)"
            >
              <span>Показать в каталоге</span>
              <UIcon name="i-lucide-arrow-right" class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl mt-4"
      >
        <div class="w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-500 flex items-center justify-center mb-3">
          <UIcon name="i-lucide-folder-search" class="w-6 h-6" />
        </div>
        <h3 class="text-sm font-bold text-zinc-200 mb-1">
          {{ searchQuery ? 'Категории не найдены' : 'Список категорий пуст' }}
        </h3>
        <p class="text-xs text-zinc-400 max-w-xs">
          {{ searchQuery ? 'Попробуйте изменить поисковый запрос' : 'Добавьте первую категорию с помощью поля выше.' }}
        </p>
      </div>
    </div>

    <!-- Rename Category Modal -->
    <UModal v-model="isEditModalOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 class="text-base font-bold text-zinc-100 flex items-center gap-2">
            <UIcon name="i-lucide-pencil" class="w-4 h-4 text-emerald-400" />
            Переименовать категорию
          </h3>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-x"
            size="sm"
            @click="isEditModalOpen = false"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1.5">
            Новое название категории
          </label>
          <input
            v-model="editCategoryName"
            type="text"
            required
            maxlength="50"
            class="w-full h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
          <p class="text-[11px] text-zinc-500 mt-1.5">
            Категория обновится сразу у всех привязанных к ней запчастей ({{ editingCategory?.partsCount || 0 }} шт).
          </p>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isEditModalOpen = false"
          />
          <UButton
            color="emerald"
            variant="solid"
            label="Сохранить"
            block
            class="flex-1 font-bold text-zinc-950"
            :disabled="!editCategoryName.trim() || isSubmitting"
            @click="executeRename"
          />
        </div>
      </div>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <div class="flex items-center gap-2 text-rose-400 font-bold text-base">
          <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-rose-500" />
          Удалить категорию?
        </div>

        <p class="text-xs text-zinc-300">
          Вы действительно хотите удалить категорию <strong>«{{ deletingCategory?.name }}»</strong>?
        </p>

        <div
          v-if="deletingCategory && deletingCategory.partsCount > 0"
          class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2"
        >
          <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Внимание: у <strong>{{ deletingCategory.partsCount }}</strong> запчастей категория будет очищена. Сами запчасти останутся в каталоге.
          </span>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            color="rose"
            variant="solid"
            label="Удалить"
            block
            class="flex-1 font-bold"
            :disabled="isSubmitting"
            @click="executeDelete"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { CategoryWithStats } from '~/types'
import { usePartsStore } from '~/stores/parts'

const router = useRouter()
const partsStore = usePartsStore()
const toast = useToast()

const newCategoryName = ref('')
const searchQuery = ref('')
const isSubmitting = ref(false)
const isRefreshing = ref(false)

// Edit state
const isEditModalOpen = ref(false)
const editingCategory = ref<CategoryWithStats | null>(null)
const editCategoryName = ref('')

// Delete state
const isDeleteModalOpen = ref(false)
const deletingCategory = ref<CategoryWithStats | null>(null)

onMounted(async () => {
  if (partsStore.parts.length === 0) {
    await partsStore.fetchParts()
  } else {
    await partsStore.fetchCategories()
  }
})

const filteredCategories = computed(() => {
  const list = partsStore.categoriesWithStats
  if (!searchQuery.value.trim()) return list
  const q = searchQuery.value.toLowerCase().trim()
  return list.filter(c => c.name.toLowerCase().includes(q))
})

function getPartsWord(count: number): string {
  const abs = Math.abs(count) % 100
  const rem = abs % 10
  if (abs > 10 && abs < 20) return 'деталей'
  if (rem > 1 && rem < 5) return 'детали'
  if (rem === 1) return 'деталь'
  return 'деталей'
}

function goToCatalog(categoryName: string) {
  partsStore.selectedCategory = categoryName
  router.push('/')
}

async function refreshData() {
  isRefreshing.value = true
  try {
    await partsStore.fetchParts()
  } finally {
    isRefreshing.value = false
  }
}

async function handleAddCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return

  isSubmitting.value = true
  try {
    await partsStore.addCategory(name)
    toast.add({
      title: 'Категория добавлена',
      description: name,
      color: 'emerald'
    })
    newCategoryName.value = ''
  } catch (err: any) {
    toast.add({
      title: 'Ошибка',
      description: err.message || 'Не удалось создать категорию',
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}

function openEditModal(cat: CategoryWithStats) {
  editingCategory.value = cat
  editCategoryName.value = cat.name
  isEditModalOpen.value = true
}

async function executeRename() {
  if (!editingCategory.value) return
  const oldName = editingCategory.value.name
  const newName = editCategoryName.value.trim()
  if (!newName) return

  isSubmitting.value = true
  try {
    await partsStore.renameCategory(oldName, newName)
    toast.add({
      title: 'Категория переименована',
      description: `${oldName} → ${newName}`,
      color: 'emerald'
    })
    isEditModalOpen.value = false
  } catch (err: any) {
    toast.add({
      title: 'Ошибка',
      description: err.message || 'Не удалось переименовать',
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}

function confirmDelete(cat: CategoryWithStats) {
  deletingCategory.value = cat
  isDeleteModalOpen.value = true
}

async function executeDelete() {
  if (!deletingCategory.value) return
  const name = deletingCategory.value.name

  isSubmitting.value = true
  try {
    await partsStore.deleteCategory(name)
    toast.add({
      title: 'Категория удалена',
      description: name,
      color: 'gray'
    })
    isDeleteModalOpen.value = false
  } catch (err: any) {
    toast.add({
      title: 'Ошибка',
      description: err.message || 'Не удалось удалить',
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
