<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-lg md:max-w-xl' }">
    <div
      class="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[88vh] overflow-hidden shadow-2xl"
      :style="sheetStyle"
    >
      <!-- Header Area -->
      <div class="px-5 pt-3 pb-3 border-b border-zinc-800/80 shrink-0">
        <!-- Mobile Bottom Sheet Drag Handle -->
        <ModalDragHandle class="-mt-1 mb-1" @pointerdown="onPointerDown" />

        <div
          class="flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none"
          @pointerdown="onPointerDown"
        >
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UIcon name="i-lucide-copy" class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-zinc-100">
                Скопировать артикул
              </h3>
              <p class="text-[11px] text-zinc-400">
                Выберите целевую деталь для копирования
              </p>
            </div>
          </div>

          <button
            type="button"
            class="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            @click="isOpen = false"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>

        <!-- Source Article Card Banner -->
        <div v-if="article" class="mt-3 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center gap-3">
          <!-- Thumbnail if article or source part has photo -->
          <div class="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              v-if="article.image"
              :src="article.image"
              :alt="article.code"
              class="w-full h-full object-cover"
            />
            <UIcon v-else name="i-lucide-barcode" class="w-5 h-5 text-emerald-400/80" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {{ article.code }}
              </span>
              <span v-if="article.name" class="text-xs text-zinc-300 font-medium truncate">
                {{ article.name }}
              </span>
            </div>
            <p v-if="currentPartName" class="text-[11px] text-zinc-500 truncate mt-0.5">
              Исходная деталь: <span class="text-zinc-400">{{ currentPartName }}</span>
            </p>
          </div>
        </div>

        <!-- Quick Search Bar -->
        <div class="mt-3 relative flex items-center">
          <UIcon name="i-lucide-search" class="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="search"
            inputmode="search"
            placeholder="Поиск детали или категории..."
            class="w-full h-9 pl-9 pr-8 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Categories & Parts Tree (Scrollable) -->
      <div class="p-4 overflow-y-auto overscroll-contain flex-1 space-y-3">
        <!-- Tree Action Toolbar (Expand/Collapse all) -->
        <div class="flex items-center justify-between px-1 text-xs">
          <span class="text-zinc-400 font-medium flex items-center gap-1.5">
            <UIcon name="i-lucide-folder-tree" class="w-3.5 h-3.5 text-emerald-400" />
            <span>Каталог деталей</span>
            <span class="text-[10px] font-mono text-zinc-500">
              ({{ totalAvailablePartsCount }})
            </span>
          </span>

          <button
            type="button"
            class="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
            @click="toggleAllCategories"
          >
            {{ isAllExpanded ? 'Свернуть все' : 'Развернуть все' }}
          </button>
        </div>

        <!-- Empty state when no categories/parts match -->
        <div
          v-if="treeData.length === 0"
          class="p-8 text-center bg-zinc-950/40 border border-zinc-800/60 rounded-xl"
        >
          <UIcon name="i-lucide-search-x" class="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p class="text-xs font-semibold text-zinc-300">Ничего не найдено</p>
          <p class="text-[11px] text-zinc-500 mt-0.5">
            Попробуйте изменить поисковый запрос
          </p>
        </div>

        <!-- Tree Nodes List -->
        <div v-else class="space-y-2">
          <div
            v-for="catNode in treeData"
            :key="catNode.name"
            class="rounded-xl border border-zinc-800/80 bg-zinc-950/40 overflow-hidden transition-colors"
          >
            <!-- Category Header Row -->
            <button
              type="button"
              class="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-zinc-800/40 active:bg-zinc-800/60 transition-colors cursor-pointer select-none"
              @click="toggleCategory(catNode.name)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <UIcon
                  :name="isExpanded(catNode.name) ? 'i-lucide-folder-open' : 'i-lucide-folder'"
                  class="w-4 h-4 text-emerald-400 shrink-0"
                />
                <span class="text-xs font-bold text-zinc-200 truncate">
                  {{ catNode.name }}
                </span>
                <span class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0">
                  {{ catNode.parts.length }}
                </span>
              </div>

              <div class="flex items-center gap-1 shrink-0 text-zinc-500">
                <UIcon
                  :name="isExpanded(catNode.name) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="w-4 h-4 transition-transform duration-150"
                />
              </div>
            </button>

            <!-- Parts inside this Category -->
            <div
              v-show="isExpanded(catNode.name)"
              class="px-2.5 pb-2.5 pt-1 space-y-1.5 border-t border-zinc-800/50"
            >
              <div
                v-for="partItem in catNode.parts"
                :key="partItem.id"
                class="relative rounded-lg p-2 transition-all select-none border"
                :class="[
                  partItem.id === currentPartId
                    ? 'opacity-40 bg-zinc-950/30 border-zinc-850 cursor-not-allowed'
                    : selectedPartId === partItem.id
                      ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30 cursor-pointer shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-850 cursor-pointer active:scale-[0.99]'
                ]"
                @click="partItem.id !== currentPartId && selectPart(partItem)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <!-- Radio / Selection Indicator -->
                  <div
                    class="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                    :class="[
                      partItem.id === currentPartId
                        ? 'border-zinc-700 bg-zinc-800'
                        : selectedPartId === partItem.id
                          ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                          : 'border-zinc-700 bg-zinc-950'
                    ]"
                  >
                    <UIcon
                      v-if="selectedPartId === partItem.id"
                      name="i-lucide-check"
                      class="w-2.5 h-2.5 stroke-[3]"
                    />
                  </div>

                  <!-- Part Thumbnail -->
                  <div class="w-8 h-8 rounded-md bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      v-if="partItem.image || partItem.articles?.find(a => a.image)?.image"
                      :src="partItem.image || partItem.articles?.find(a => a.image)?.image"
                      :alt="partItem.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <UIcon v-else name="i-lucide-package" class="w-4 h-4 text-zinc-600" />
                  </div>

                  <!-- Part Name & Details -->
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="text-xs font-semibold leading-tight line-clamp-1"
                        :class="selectedPartId === partItem.id ? 'text-emerald-300' : 'text-zinc-200'"
                      >
                        {{ partItem.name }}
                      </span>
                    </div>

                    <!-- Subline: Articles Count / Badges -->
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap text-[11px]">
                      <span class="text-zinc-500">
                        {{ partItem.articles?.length || 0 }} арт.
                      </span>

                      <!-- Current Part Badge -->
                      <span
                        v-if="partItem.id === currentPartId"
                        class="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 font-medium"
                      >
                        Текущая деталь
                      </span>

                      <!-- Already has article badge -->
                      <span
                        v-else-if="doesPartAlreadyHaveArticle(partItem)"
                        class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium"
                      >
                        <UIcon name="i-lucide-alert-circle" class="w-3 h-3" />
                        <span>Уже есть этот артикул</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Copy Options Section (Visible if a part is selected) -->
        <div v-if="selectedPart" class="pt-2 pb-1 space-y-2.5">
          <div class="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
            <span class="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
              Параметры копирования
            </span>

            <!-- Copy Stock Option -->
            <label class="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                v-model="copyStock"
                type="checkbox"
                class="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
              />
              <div class="text-xs">
                <span class="font-medium text-zinc-200">Скопировать текущие остатки</span>
                <span class="block text-[11px] text-zinc-400">
                  Новые: {{ article?.stock_new || 0 }} шт, Б/У: {{ article?.stock_used || 0 }} шт
                  <span v-if="!copyStock" class="text-zinc-500">(по умолчанию остатки будут равны 0)</span>
                </span>
              </div>
            </label>

            <!-- Copy Photo Option (if article has photo) -->
            <label v-if="article?.image" class="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                v-model="copyPhoto"
                type="checkbox"
                class="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
              />
              <div class="text-xs">
                <span class="font-medium text-zinc-200">Скопировать фотографию артикула</span>
                <span class="block text-[11px] text-zinc-500">
                  Сохранить прикрепленное фото в новой детали
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Sticky Footer Actions -->
      <div class="p-4 bg-zinc-900/95 border-t border-zinc-800/80 shrink-0 flex items-center gap-2.5">
        <button
          type="button"
          class="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-300 font-semibold text-xs transition-all cursor-pointer"
          @click="isOpen = false"
        >
          Отмена
        </button>

        <button
          type="button"
          :disabled="!selectedPart || isCopying"
          class="flex-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          @click="executeCopy"
        >
          <UIcon v-if="isCopying" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
          <UIcon v-else name="i-lucide-copy" class="w-4 h-4 stroke-[2.5]" />
          <span class="truncate">
            {{ copyButtonLabel }}
          </span>
        </button>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { Part, PartArticle } from '~/types'
import { usePartsStore } from '~/stores/parts'
import { useSwipeDismiss } from '~/composables/useSwipeDismiss'
import { useHaptics } from '~/composables/useHaptics'

const props = defineProps<{
  modelValue: boolean
  article: PartArticle | null
  currentPartId: number
  currentPartName?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'copied', targetPart: Part, newArticle: PartArticle): void
}>()

const partsStore = usePartsStore()
const toast = useToast()
const haptics = useHaptics()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const { sheetStyle, onPointerDown } = useSwipeDismiss({
  onDismiss: () => {
    isOpen.value = false
  },
  isOpen
})

// Search & Filtering
const searchQuery = ref('')
const selectedPartId = ref<number | null>(null)
const copyStock = ref(false)
const copyPhoto = ref(true)
const isCopying = ref(false)

// Track expanded categories
const expandedCategories = ref<Set<string>>(new Set())

interface CategoryTreeNode {
  name: string
  isUncategorized?: boolean
  parts: Part[]
}

// Watch modal open state to reset search and selections
watch(isOpen, (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    selectedPartId.value = null
    copyStock.value = false
    copyPhoto.value = true
    isCopying.value = false

    // Initialize all categories as expanded by default
    const allCatNames = new Set<string>()
    partsStore.categories.forEach(c => allCatNames.add(c))
    allCatNames.add('Без категории')
    expandedCategories.value = allCatNames
  }
})

// Auto-expand all matching categories when searching
watch(searchQuery, (query) => {
  if (query.trim()) {
    const allMatchingCats = new Set<string>()
    treeData.value.forEach(node => allMatchingCats.add(node.name))
    expandedCategories.value = allMatchingCats
  }
})

// Filter and group parts into category tree
const treeData = computed<CategoryTreeNode[]>(() => {
  const query = searchQuery.value.toLowerCase().trim()
  const allParts = partsStore.parts || []

  // Function to check if a part matches query
  function matchesPart(p: Part): boolean {
    if (!query) return true
    if (p.name.toLowerCase().includes(query)) return true
    if (p.category && p.category.toLowerCase().includes(query)) return true
    if (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) return true
    if (p.articles && p.articles.some(a => a.code.toLowerCase().includes(query) || (a.name && a.name.toLowerCase().includes(query)))) return true
    return false
  }

  const result: CategoryTreeNode[] = []

  // 1. Process named categories
  for (const cat of partsStore.categories) {
    const partsInCat = allParts.filter(p => {
      const matchCat = (p.category || '').trim() === cat.trim()
      return matchCat && matchesPart(p)
    })

    if (partsInCat.length > 0) {
      result.push({
        name: cat,
        parts: partsInCat
      })
    }
  }

  // 2. Process uncategorized parts
  const uncategorizedParts = allParts.filter(p => {
    const noCat = !p.category || !p.category.trim()
    return noCat && matchesPart(p)
  })

  if (uncategorizedParts.length > 0) {
    result.push({
      name: 'Без категории',
      isUncategorized: true,
      parts: uncategorizedParts
    })
  }

  return result
})

const totalAvailablePartsCount = computed(() => {
  return treeData.value.reduce((sum, node) => sum + node.parts.length, 0)
})

const isAllExpanded = computed(() => {
  if (treeData.value.length === 0) return false
  return treeData.value.every(n => expandedCategories.value.has(n.name))
})

function isExpanded(catName: string): boolean {
  return expandedCategories.value.has(catName)
}

function toggleCategory(catName: string) {
  haptics.lightTap()
  const updated = new Set(expandedCategories.value)
  if (updated.has(catName)) {
    updated.delete(catName)
  } else {
    updated.add(catName)
  }
  expandedCategories.value = updated
}

function toggleAllCategories() {
  haptics.lightTap()
  if (isAllExpanded.value) {
    expandedCategories.value = new Set()
  } else {
    const all = new Set<string>()
    treeData.value.forEach(n => all.add(n.name))
    expandedCategories.value = all
  }
}

function selectPart(part: Part) {
  haptics.lightTap()
  selectedPartId.value = part.id
}

const selectedPart = computed<Part | null>(() => {
  if (!selectedPartId.value) return null
  return partsStore.parts.find(p => p.id === selectedPartId.value) || null
})

function doesPartAlreadyHaveArticle(part: Part): boolean {
  if (!props.article || !part.articles) return false
  const targetCode = props.article.code.toLowerCase().trim()
  return part.articles.some(a => a.code.toLowerCase().trim() === targetCode)
}

const copyButtonLabel = computed(() => {
  if (!selectedPart.value) return 'Выберите деталь'
  const name = selectedPart.value.name
  const truncated = name.length > 22 ? name.substring(0, 20) + '...' : name
  return `Скопировать в «${truncated}»`
})

async function executeCopy() {
  if (!selectedPart.value || !props.article) return

  const targetPart = selectedPart.value
  const sourceArticle = props.article

  isCopying.value = true
  try {
    const newArticleData: Omit<PartArticle, 'id'> = {
      code: sourceArticle.code.trim(),
      name: sourceArticle.name ? sourceArticle.name.trim() : '',
      image: copyPhoto.value && sourceArticle.image ? sourceArticle.image : '',
      stock_new: copyStock.value ? Math.max(0, Number(sourceArticle.stock_new) || 0) : 0,
      stock_used: copyStock.value ? Math.max(0, Number(sourceArticle.stock_used) || 0) : 0,
      min_stock: Number(sourceArticle.min_stock) || 0,
      price_new: Number(sourceArticle.price_new) || 0,
      price_used: Number(sourceArticle.price_used) || 0
    }

    const updatedPart = await partsStore.addArticle(targetPart.id, newArticleData)
    const addedArticle = updatedPart.articles[updatedPart.articles.length - 1]

    haptics.successVibe()
    toast.add({
      title: 'Артикул скопирован',
      description: `Артикул «${sourceArticle.code}» добавлен в деталь «${targetPart.name}»`,
      color: 'emerald',
      actions: [
        {
          label: 'Перейти к детали',
          click: () => navigateTo(`/part/${targetPart.id}`)
        }
      ]
    })

    emit('copied', targetPart, addedArticle)
    isOpen.value = false
  } catch (err: any) {
    haptics.errorVibe()
    toast.add({
      title: 'Ошибка копирования',
      description: err.message || 'Не удалось скопировать артикул',
      color: 'red'
    })
  } finally {
    isCopying.value = false
  }
}
</script>
