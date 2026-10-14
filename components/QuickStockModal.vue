<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md md:max-w-lg' }">
    <div
      class="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 max-h-[90vh] flex flex-col"
      :style="sheetStyle"
    >
      <!-- Mobile Drag Handle -->
      <ModalDragHandle class="-mt-2 mb-1" @pointerdown="onPointerDown" />

      <!-- Modal Header -->
      <div
        class="flex items-center justify-between pb-3 border-b border-zinc-800 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
        @pointerdown="onPointerDown"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center"
            :class="operationType === 'IN' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'"
          >
            <UIcon :name="operationType === 'IN' ? 'i-lucide-arrow-down-left' : 'i-lucide-arrow-up-right'" class="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-zinc-100">
              {{ operationType === 'IN' ? 'Быстрый приход детали' : 'Быстрое списание детали' }}
            </h3>
            <p class="text-[11px] text-zinc-400">
              {{ selectedItem ? 'Укажите количество и причину' : 'Найдите артикул для операции' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          @click="isOpen = false"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Type Switcher (Приход / Списание) -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 shrink-0">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          :class="operationType === 'IN'
            ? 'bg-emerald-600 text-zinc-950 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'"
          @click="setOperationType('IN')"
        >
          <UIcon name="i-lucide-plus" class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Приход (+)</span>
        </button>

        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          :class="operationType === 'OUT'
            ? 'bg-rose-600 text-zinc-100 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'"
          @click="setOperationType('OUT')"
        >
          <UIcon name="i-lucide-minus" class="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Списание (-)</span>
        </button>
      </div>

      <!-- STEP 1: Search and Select Article (when none selected) -->
      <div v-if="!selectedItem" class="flex-1 min-h-0 flex flex-col space-y-3">
        <!-- Search Field -->
        <div class="relative shrink-0">
          <UIcon name="i-lucide-search" class="absolute left-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            inputmode="search"
            enterkeyhint="search"
            autofocus
            placeholder="Поиск артикула, кода или детали..."
            class="w-full h-10 pl-10 pr-10 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 top-2.5 p-0.5 rounded-full text-zinc-500 hover:text-zinc-300"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>

        <!-- Filtered Articles List -->
        <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px] max-h-[360px]">
          <div
            v-if="filteredItems.length === 0"
            class="py-10 text-center text-zinc-500 text-xs"
          >
            <UIcon name="i-lucide-search-x" class="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p>Артикулы не найдены</p>
            <p class="text-[11px] text-zinc-600 mt-0.5">Попробуйте ввести код или название детали</p>
          </div>

          <button
            v-for="item in filteredItems"
            :key="`${item.partId}-${item.articleId}`"
            type="button"
            class="w-full text-left p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-emerald-500/50 hover:bg-zinc-900 active:scale-[0.99] transition-all cursor-pointer group"
            @click="selectItem(item)"
          >
            <div class="flex items-start justify-between gap-2 mb-1">
              <span class="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 group-hover:border-emerald-500/40">
                {{ item.articleCode }}
              </span>
              <span class="text-[10px] text-zinc-500 shrink-0">
                {{ item.category }}
              </span>
            </div>

            <p class="text-xs font-semibold text-zinc-200 line-clamp-1 mb-1">
              {{ item.partName }}
            </p>

            <div class="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/40">
              <span v-if="item.articleName" class="text-zinc-400 line-clamp-1 text-[11px] max-w-[180px]">
                {{ item.articleName }}
              </span>
              <span v-else class="text-zinc-600 text-[11px] italic">Основной артикул</span>

              <div class="flex items-center gap-2 font-mono text-[11px] shrink-0 ml-auto">
                <span class="text-blue-400">Нов: {{ item.stockNew }}</span>
                <span class="text-zinc-600">·</span>
                <span class="text-amber-400">Б/У: {{ item.stockUsed }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- STEP 2: Configure and Submit (when article is selected) -->
      <div v-else class="space-y-4">
        <!-- Selected Item Card with Change Button -->
        <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {{ selectedItem.articleCode }}
              </span>
              <span class="text-[10px] text-zinc-500">{{ selectedItem.category }}</span>
            </div>
            <h4 class="text-xs font-bold text-zinc-100 line-clamp-1">
              {{ selectedItem.partName }}
            </h4>
            <p v-if="selectedItem.articleName" class="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {{ selectedItem.articleName }}
            </p>
          </div>

          <button
            type="button"
            class="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-zinc-300 hover:text-zinc-100 active:scale-95 transition-all shrink-0 cursor-pointer"
            @click="clearSelection"
          >
            Изменить
          </button>
        </div>

        <!-- Condition Selector (Новая / Б/У) -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5">
            Состояние детали
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 cursor-pointer"
              :class="condition === 'NEW'
                ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'"
              @click="setCondition('NEW')"
            >
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-blue-500" />
                <span>Новая</span>
              </div>
              <span class="font-mono text-xs">{{ selectedItem.stockNew }} шт</span>
            </button>

            <button
              type="button"
              class="flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 cursor-pointer"
              :class="condition === 'USED'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'"
              @click="setCondition('USED')"
            >
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-500" />
                <span>Б/У</span>
              </div>
              <span class="font-mono text-xs">{{ selectedItem.stockUsed }} шт</span>
            </button>
          </div>
        </div>

        <!-- Quantity Stepper -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-medium text-zinc-400">
              Количество (шт)
            </label>
            <span class="text-xs text-zinc-500 font-mono">
              В наличии: <strong class="text-zinc-200">{{ currentAvailableStock }} шт</strong>
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all text-lg font-bold disabled:opacity-40 cursor-pointer"
              :disabled="quantity <= 1"
              @click="decreaseQty"
            >
              <UIcon name="i-lucide-minus" class="w-4 h-4 stroke-[2.5]" />
            </button>

            <input
              v-model.number="quantity"
              type="number"
              min="1"
              class="flex-1 h-11 text-center rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-lg font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
            />

            <button
              type="button"
              class="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all text-lg font-bold cursor-pointer"
              @click="increaseQty"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <!-- Quick Increment Buttons -->
          <div class="flex items-center gap-1.5 mt-2">
            <button
              v-for="amt in [1, 2, 5, 10]"
              :key="amt"
              type="button"
              class="flex-1 py-1 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] font-mono font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
              @click="setQuantity(amt)"
            >
              +{{ amt }}
            </button>
          </div>
        </div>

        <!-- Reason Input -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1.5">
            Причина / Заказ-наряд (опционально)
          </label>
          <input
            v-model="reason"
            type="text"
            :placeholder="operationType === 'IN' ? 'Например: Поставка от поставщика, приход' : 'Например: Заказ-наряд #312 (DeLonghi Magnifica)'"
            class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40"
          />
        </div>

        <!-- Action Button -->
        <div class="pt-2">
          <button
            type="button"
            class="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            :class="operationType === 'IN'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-emerald-950/40'
              : 'bg-rose-600 hover:bg-rose-500 text-zinc-100 shadow-rose-950/40'"
            :disabled="isSubmitting"
            @click="submitMovement"
          >
            <UIcon
              v-if="isSubmitting"
              name="i-lucide-loader-2"
              class="w-4 h-4 animate-spin"
            />
            <UIcon
              v-else
              :name="operationType === 'IN' ? 'i-lucide-plus-circle' : 'i-lucide-minus-circle'"
              class="w-4 h-4 stroke-[2.5]"
            />
            <span>
              {{ operationType === 'IN' ? `Оприходовать (+${quantity} шт)` : `Списать (-${quantity} шт)` }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { usePartsStore } from '~/stores/parts'
import { useHaptics } from '~/composables/useHaptics'
import { useSwipeDismiss } from '~/composables/useSwipeDismiss'
import type { MovementType, PartCondition } from '~/types'

interface SearchableArticleItem {
  partId: number
  partName: string
  category: string
  articleId: string
  articleCode: string
  articleName: string
  stockNew: number
  stockUsed: number
  minStock: number
  priceNew: number
  priceUsed: number
}

const props = defineProps<{
  modelValue: boolean
  defaultType?: MovementType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const partsStore = usePartsStore()
const toast = useToast()
const haptics = useHaptics()

const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const { sheetStyle, onPointerDown } = useSwipeDismiss({
  isOpen,
  onDismiss: () => {
    isOpen.value = false
  }
})

const operationType = ref<MovementType>('OUT')
const searchQuery = ref('')
const selectedItem = ref<SearchableArticleItem | null>(null)
const condition = ref<PartCondition>('NEW')
const quantity = ref(1)
const reason = ref('')
const isSubmitting = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

// Flatten all articles across all parts
const allItems = computed<SearchableArticleItem[]>(() => {
  const result: SearchableArticleItem[] = []
  const list = partsStore.parts || []
  for (const p of list) {
    if (!p) continue
    const articles = Array.isArray(p.articles) && p.articles.length > 0
      ? p.articles
      : [{
          id: `art-${p.id}-1`,
          code: p.code || '',
          name: '',
          stock_new: p.stock_new,
          stock_used: p.stock_used,
          min_stock: p.min_stock,
          price_new: p.price_new,
          price_used: p.price_used
        }]

    for (const a of articles) {
      if (!a) continue
      result.push({
        partId: p.id,
        partName: String(p.name || 'Без названия'),
        category: String(p.category || 'Без категории'),
        articleId: String(a.id || `art-${p.id}`),
        articleCode: String(a.code || p.code || 'БЕЗ АРТИКУЛА'),
        articleName: String(a.name || ''),
        stockNew: Number(a.stock_new) || 0,
        stockUsed: Number(a.stock_used) || 0,
        minStock: Number(a.min_stock) || 0,
        priceNew: Number(a.price_new) || 0,
        priceUsed: Number(a.price_used) || 0
      })
    }
  }
  return result
})

// Search filtered list
const filteredItems = computed(() => {
  const q = (searchQuery.value || '').toLowerCase().trim()
  if (!q) return allItems.value.slice(0, 30)
  return allItems.value.filter(item => {
    const code = (item.articleCode || '').toLowerCase()
    const pName = (item.partName || '').toLowerCase()
    const aName = (item.articleName || '').toLowerCase()
    const cat = (item.category || '').toLowerCase()
    return code.includes(q) || pName.includes(q) || aName.includes(q) || cat.includes(q)
  }).slice(0, 50)
})

const currentAvailableStock = computed(() => {
  if (!selectedItem.value) return 0
  return condition.value === 'NEW' ? selectedItem.value.stockNew : selectedItem.value.stockUsed
})

watch(() => props.modelValue, (open) => {
  if (open) {
    if (props.defaultType) {
      operationType.value = props.defaultType
    }
    quantity.value = 1
    reason.value = ''
    selectedItem.value = null
    searchQuery.value = ''
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
})

function setOperationType(type: MovementType) {
  try { haptics.lightTap() } catch {}
  operationType.value = type
}

function selectItem(item: SearchableArticleItem) {
  try { haptics.lightTap() } catch {}
  selectedItem.value = item
  quantity.value = 1
  if (operationType.value === 'OUT' && item.stockNew === 0 && item.stockUsed > 0) {
    condition.value = 'USED'
  } else {
    condition.value = 'NEW'
  }
}

function clearSelection() {
  selectedItem.value = null
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function setCondition(cond: PartCondition) {
  try { haptics.lightTap() } catch {}
  condition.value = cond
}

function increaseQty() {
  try { haptics.lightTap() } catch {}
  quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) {
    try { haptics.lightTap() } catch {}
    quantity.value--
  }
}

function setQuantity(amt: number) {
  try { haptics.lightTap() } catch {}
  quantity.value = amt
}

async function submitMovement() {
  if (!selectedItem.value) return
  if (quantity.value <= 0) {
    toast.add({ title: 'Ошибка', description: 'Количество должно быть больше 0', color: 'red' })
    return
  }

  isSubmitting.value = true
  try {
    const finalReason = reason.value.trim() || (operationType.value === 'IN' ? 'Быстрый приход' : 'Быстрое списание')
    await partsStore.recordMovement({
      partId: selectedItem.value.partId,
      articleId: selectedItem.value.articleId,
      type: operationType.value,
      condition: condition.value,
      quantity: quantity.value,
      reason: finalReason
    })

    haptics.successVibe()
    const condLabel = condition.value === 'NEW' ? 'Новые' : 'Б/У'
    const actLabel = operationType.value === 'IN' ? 'оприходовано' : 'списано'
    toast.add({
      title: 'Успешно проведено',
      description: `${selectedItem.value.articleCode}: ${actLabel} ${quantity.value} шт (${condLabel})`,
      color: 'emerald'
    })
    isOpen.value = false
  } catch (err: any) {
    haptics.errorVibe()
    toast.add({
      title: 'Ошибка операции',
      description: err.message || 'Не удалось сохранить движение',
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
