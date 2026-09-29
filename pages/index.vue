<template>
  <div class="pb-28">
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
            type="search"
            inputmode="search"
            enterkeyhint="search"
            autocorrect="off"
            spellcheck="false"
            placeholder="Поиск детали (помпа, жернова, клапан, артикул)..."
            class="w-full h-11 pl-10 pr-10 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors shadow-inner"
          />
          <button
            v-if="partsStore.searchQuery"
            type="button"
            class="absolute right-3 p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
            @click="clearSearch"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Horizontal Stock Filter Pills (Все / Мало / Закончились) -->
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="filter in stockFilters"
          :key="filter.id"
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border shrink-0 transition-all active:scale-95 cursor-pointer"
          :class="partsStore.stockFilter === filter.id
            ? getActiveFilterClass(filter.id)
            : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'"
          @click="selectStockFilter(filter.id)"
        >
          <span>{{ filter.label }}</span>
          <span
            v-if="filter.count !== undefined"
            class="text-[11px] font-mono tabular-nums transition-colors"
            :class="partsStore.stockFilter === filter.id ? getActiveFilterBadgeClass(filter.id) : 'text-zinc-500'"
          >
            {{ filter.count }}
          </span>
        </button>
      </div>

      <!-- Categories Pills (if categories exist) -->
      <div v-if="partsStore.categories.length > 0" class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border shrink-0 transition-colors cursor-pointer"
          :class="partsStore.selectedCategory === 'all'
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="selectCategory('all')"
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
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap border shrink-0 transition-colors cursor-pointer"
          :class="partsStore.selectedCategory === cat
            ? 'bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm'
            : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'"
          @click="selectCategory(cat)"
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

      <!-- VIEW MODE 1: "Все" (Standard PartCard Catalog) -->
      <template v-if="partsStore.stockFilter === 'all'">
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

        <!-- Empty State for All -->
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
      </template>

      <!-- VIEW MODE 2 & 3: "Мало" / "Закончились" (Grouped Deficit Lists) -->
      <template v-else>
        <div v-if="currentGroupedList.length > 0" class="space-y-4 pt-1">
          <!-- Summary Header -->
          <div class="flex items-center justify-between px-1 text-xs text-zinc-400">
            <span class="font-medium">
              {{ partsStore.stockFilter === 'low' ? 'Позиции с нехваткой с собой:' : 'Закончившиеся позиции:' }}
            </span>
            <span class="font-mono text-zinc-300 font-semibold">
              {{ currentGroupedList.length }} дет. · {{ currentArticlesTotalCount }} арт.
            </span>
          </div>

          <!-- Grouped Cards -->
          <div class="space-y-3">
            <div
              v-for="group in currentGroupedList"
              :key="group.part.id"
              class="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-3.5 space-y-3 shadow-sm transition-all"
            >
              <!-- Part Header: Photo/Icon + Name + Category -->
              <div
                class="flex items-center gap-3 cursor-pointer group/hdr"
                title="Перейти к детали"
                @click="navigateToPart(group.part.id)"
              >
                <!-- Thumbnail / Icon -->
                <div class="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    v-if="group.part.image"
                    :src="group.part.image"
                    :alt="group.part.name"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <UIcon v-else name="i-lucide-package" class="w-5 h-5 text-zinc-600" />
                </div>

                <!-- Name and Category -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                      v-if="group.part.category"
                      class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 truncate max-w-[140px]"
                    >
                      {{ group.part.category }}
                    </span>
                    <span
                      class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      :class="partsStore.stockFilter === 'low' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'"
                    >
                      {{ group.articles.length }} арт.
                    </span>
                  </div>
                  <h3 class="text-sm font-semibold text-zinc-100 group-hover/hdr:text-emerald-300 transition-colors line-clamp-1 mt-0.5">
                    {{ group.part.name }}
                  </h3>
                </div>
              </div>

              <!-- Articles List -->
              <div class="space-y-2">
                <div
                  v-for="article in group.articles"
                  :key="article.id"
                  class="rounded-xl p-2.5 transition-all cursor-pointer select-none space-y-2"
                  :class="isArticleSelected(article.id)
                    ? 'bg-zinc-950/95 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/60'"
                  @click="toggleArticleSelection(article.id)"
                >
                  <!-- Line 1: Checkbox + Article Code + Article Note -->
                  <div class="flex items-center gap-2 min-w-0">
                    <!-- Checkbox (Touch target min 28x28, fixed w-5 h-5 box, thin 1px border) -->
                    <button
                      type="button"
                      role="checkbox"
                      :aria-checked="isArticleSelected(article.id)"
                      class="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-200 active:scale-90 transition-all shrink-0 cursor-pointer"
                      :title="isArticleSelected(article.id) ? 'Снять отметку' : 'Выбрать артикул'"
                      @click.stop="toggleArticleSelection(article.id)"
                    >
                      <div
                        class="w-5 h-5 rounded-[5px] border flex items-center justify-center shrink-0 transition-all"
                        :class="isArticleSelected(article.id)
                          ? 'border-emerald-500 bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30'
                          : 'border-zinc-700 bg-zinc-900/90 hover:border-zinc-500'"
                      >
                        <UIcon
                          v-if="isArticleSelected(article.id)"
                          name="i-lucide-check"
                          class="w-3.5 h-3.5 stroke-[2.5]"
                        />
                      </div>
                    </button>

                    <!-- Article Code Badge (Click to Copy) -->
                    <button
                      type="button"
                      class="h-7 inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-emerald-400 cursor-pointer transition-all border border-zinc-700/60 shrink-0"
                      title="Нажмите, чтобы скопировать артикул"
                      @click.stop="copyArticleCode(article.code)"
                    >
                      <UIcon name="i-lucide-barcode" class="w-3.5 h-3.5" />
                      <span>{{ article.code }}</span>
                    </button>

                    <!-- Article Note/Name -->
                    <span
                      v-if="article.name"
                      class="text-xs text-zinc-400 font-medium truncate min-w-0 flex-1"
                      :title="article.name"
                    >
                      {{ article.name }}
                    </span>
                  </div>

                  <!-- Line 2: Stock status ("Есть 0 шт. / Нужно 0 шт.") + Deficit Badge & Quick Replenish Button -->
                  <div class="flex items-center justify-between gap-2 pl-8">
                    <!-- Stock text: "Есть 0 шт. / Нужно 0 шт." -->
                    <div
                      class="text-xs text-zinc-400 font-medium leading-none"
                      :title="`Новые: ${article.stock_new} шт, Б/У: ${article.stock_used} шт`"
                    >
                      <template v-if="partsStore.stockFilter === 'low'">
                        Есть <strong class="text-amber-300 font-mono">{{ article.totalStock }} шт.</strong>
                        <span class="text-zinc-600 mx-1">/</span>
                        Нужно <strong class="text-zinc-300 font-mono">{{ article.min_stock }} шт.</strong>
                      </template>
                      <template v-else>
                        Есть <strong class="text-rose-400 font-mono">0 шт.</strong>
                        <template v-if="article.min_stock > 0">
                          <span class="text-zinc-600 mx-1">/</span>
                          Нужно <strong class="text-zinc-300 font-mono">{{ article.min_stock }} шт.</strong>
                        </template>
                      </template>
                    </div>

                    <!-- Deficit Badge + Quick Replenish Button (exact same height: h-7) -->
                    <div class="flex items-center gap-1.5 shrink-0">
                      <!-- Deficit badge -->
                      <span
                        v-if="partsStore.stockFilter === 'low'"
                        class="h-7 px-2.5 rounded-lg flex items-center justify-center text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono whitespace-nowrap shadow-sm"
                      >
                        +{{ article.deficit }} шт
                      </span>
                      <span
                        v-else
                        class="h-7 px-2.5 rounded-lg flex items-center justify-center text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono whitespace-nowrap shadow-sm"
                      >
                        0 шт
                      </span>

                      <!-- Quick Replenish "+" button -->
                      <button
                        type="button"
                        class="w-7 h-7 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-emerald-500/20 active:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-emerald-400 border border-zinc-700/60 transition-all cursor-pointer shrink-0"
                        title="Пополнить запас"
                        @click.stop="openReplenishModal(group.part, article)"
                      >
                        <UIcon name="i-lucide-plus" class="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons: Selection controls + "Импорт в XLS" / "Копировать в буфер" -->
          <div class="pt-3 pb-12 space-y-3">
            <!-- Selection Counter Info (above buttons) -->
            <div class="px-1 text-xs text-zinc-400 font-mono">
              Выбрано: <strong :class="selectedArticleIds.size > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500'">{{ selectedArticleIds.size }}</strong> / {{ currentArticlesTotalCount }}
            </div>

            <!-- Neutral Selection Controls: "Выбрать все" and "Снять все" -->
            <div class="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800/90 text-zinc-300 border border-zinc-800 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                @click="selectAllArticles"
              >
                <UIcon name="i-lucide-check-square" class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Выбрать все</span>
              </button>

              <button
                type="button"
                :disabled="selectedArticleIds.size === 0"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800/90 text-zinc-400 hover:text-zinc-300 border border-zinc-800 shadow-sm active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
                @click="unselectAllArticles"
              >
                <UIcon name="i-lucide-square" class="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>Снять все</span>
              </button>
            </div>

            <!-- Import and Copy buttons: only shown if something is selected with a checkmark! -->
            <div v-if="selectedArticleIds.size > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <!-- Кнопка 1: Импорт в XLS -->
              <button
                type="button"
                class="w-full h-12 flex items-center justify-center gap-2.5 px-4 rounded-xl text-sm font-semibold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800/90 text-zinc-200 border border-zinc-700/80 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                @click="exportCurrentListToXLS"
              >
                <UIcon name="i-lucide-file-spreadsheet" class="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Импорт в XLS ({{ selectedArticleIds.size }})</span>
              </button>

              <!-- Кнопка 2: Копировать в буфер -->
              <button
                type="button"
                class="w-full h-12 flex items-center justify-center gap-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
                @click="copyCurrentListToClipboard"
              >
                <UIcon name="i-lucide-copy" class="w-5 h-5 shrink-0" />
                <span>Копировать в буфер ({{ selectedArticleIds.size }})</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state when no items in 'low' or 'out' -->
        <div
          v-else
          class="flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-2xl mt-4"
        >
          <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <UIcon name="i-lucide-check-circle-2" class="w-6 h-6 stroke-[2]" />
          </div>
          <h3 class="text-sm font-bold text-zinc-100 mb-1">
            {{ partsStore.stockFilter === 'low' ? 'Все запасы в норме' : 'Нет закончившихся позиций' }}
          </h3>
          <p class="text-xs text-zinc-400 max-w-xs">
            {{ partsStore.stockFilter === 'low'
              ? 'Все артикулы с заданным минимальным запасом имеются в достаточном количестве.'
              : 'В каталоге нет позиций с нулевым остатком.' }}
          </p>
        </div>
      </template>
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
      :article="selectedArticle"
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
import type { Part, PartArticle, MovementType } from '~/types'
import { usePartsStore } from '~/stores/parts'
import { exportLowStockToExcel, exportOutOfStockToExcel, type DeficitArticleExportRow } from '~/utils/exportImport'

const partsStore = usePartsStore()
const toast = useToast()
const haptics = useHaptics()
const { copyToClipboard } = useClipboardCopy()

function selectStockFilter(filterId: any) {
  haptics.lightTap()
  partsStore.stockFilter = filterId
}

function selectCategory(cat: string) {
  haptics.lightTap()
  partsStore.selectedCategory = cat
}

function clearSearch() {
  haptics.lightTap()
  partsStore.searchQuery = ''
}

function navigateToPart(id: number) {
  haptics.lightTap()
  navigateTo(`/part/${id}`)
}

function copyArticleCode(code: string) {
  haptics.lightTap()
  copyToClipboard(code, 'Артикул')
}

interface DeficitArticleItem {
  id: string
  code: string
  name?: string
  stock_new: number
  stock_used: number
  totalStock: number
  min_stock: number
  deficit: number
}

interface GroupedDeficitPart {
  part: Part
  articles: DeficitArticleItem[]
}

const lowStockGrouped = computed<GroupedDeficitPart[]>(() => {
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
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (Array.isArray(p.articles) && p.articles.some(a =>
        a.code.toLowerCase().includes(q) || (a.name && a.name.toLowerCase().includes(q))
      ))
    )
  }

  const result: GroupedDeficitPart[] = []

  for (const part of pool) {
    if (!part) continue
    const articles = Array.isArray(part.articles) && part.articles.length > 0
      ? part.articles
      : [{
          id: `art-${part.id}-1`,
          code: part.code || 'АРТИКУЛ',
          name: '',
          stock_new: part.stock_new || 0,
          stock_used: part.stock_used || 0,
          min_stock: part.min_stock || 0
        }]

    const matchingArticles: DeficitArticleItem[] = []

    for (const art of articles) {
      const stockNew = Number(art.stock_new) || 0
      const stockUsed = Number(art.stock_used) || 0
      const totalStock = stockNew + stockUsed
      const minStock = Number(art.min_stock) || 0

      if (minStock > 0 && totalStock < minStock) {
        matchingArticles.push({
          id: art.id,
          code: art.code,
          name: art.name || '',
          stock_new: stockNew,
          stock_used: stockUsed,
          totalStock,
          min_stock: minStock,
          deficit: minStock - totalStock
        })
      }
    }

    if (matchingArticles.length > 0) {
      result.push({
        part,
        articles: matchingArticles
      })
    }
  }

  return result
})

const outOfStockGrouped = computed<GroupedDeficitPart[]>(() => {
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
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (Array.isArray(p.articles) && p.articles.some(a =>
        a.code.toLowerCase().includes(q) || (a.name && a.name.toLowerCase().includes(q))
      ))
    )
  }

  const result: GroupedDeficitPart[] = []

  for (const part of pool) {
    if (!part) continue
    const articles = Array.isArray(part.articles) && part.articles.length > 0
      ? part.articles
      : [{
          id: `art-${part.id}-1`,
          code: part.code || 'АРТИКУЛ',
          name: '',
          stock_new: part.stock_new || 0,
          stock_used: part.stock_used || 0,
          min_stock: part.min_stock || 0
        }]

    const matchingArticles: DeficitArticleItem[] = []

    for (const art of articles) {
      const stockNew = Number(art.stock_new) || 0
      const stockUsed = Number(art.stock_used) || 0
      const totalStock = stockNew + stockUsed
      const minStock = Number(art.min_stock) || 0

      if (totalStock === 0) {
        matchingArticles.push({
          id: art.id,
          code: art.code,
          name: art.name || '',
          stock_new: stockNew,
          stock_used: stockUsed,
          totalStock: 0,
          min_stock: minStock,
          deficit: minStock > 0 ? minStock : 1
        })
      }
    }

    if (matchingArticles.length > 0) {
      result.push({
        part,
        articles: matchingArticles
      })
    }
  }

  return result
})

const currentGroupedList = computed<GroupedDeficitPart[]>(() => {
  if (partsStore.stockFilter === 'low') {
    return lowStockGrouped.value
  }
  if (partsStore.stockFilter === 'out') {
    return outOfStockGrouped.value
  }
  return []
})

const currentArticlesTotalCount = computed(() => {
  return currentGroupedList.value.reduce((sum, g) => sum + g.articles.length, 0)
})

// Selection state for grouped deficit list (article-level selection)
const selectedArticleIds = ref<Set<string>>(new Set())

function isArticleSelected(id: string): boolean {
  return selectedArticleIds.value.has(id)
}

function toggleArticleSelection(id: string) {
  haptics.lightTap()
  const next = new Set(selectedArticleIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedArticleIds.value = next
}

function selectAllArticles() {
  haptics.lightTap()
  const ids: string[] = []
  for (const g of currentGroupedList.value) {
    for (const a of g.articles) {
      ids.push(a.id)
    }
  }
  selectedArticleIds.value = new Set(ids)
}

function unselectAllArticles() {
  haptics.lightTap()
  selectedArticleIds.value = new Set()
}

// Reset selection on filter or search changes
watch([() => partsStore.stockFilter, () => partsStore.selectedCategory, () => partsStore.searchQuery], () => {
  selectedArticleIds.value = new Set()
})

const selectedGroupedList = computed(() => {
  const result: GroupedDeficitPart[] = []
  for (const g of currentGroupedList.value) {
    const matching = g.articles.filter(a => selectedArticleIds.value.has(a.id))
    if (matching.length > 0) {
      result.push({
        part: g.part,
        articles: matching
      })
    }
  }
  return result
})

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
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (Array.isArray(p.articles) && p.articles.some(a =>
        a.code.toLowerCase().includes(q) || (a.name && a.name.toLowerCase().includes(q))
      ))
    )
  }

  const allCount = pool.length
  const lowCount = lowStockGrouped.value.reduce((sum, g) => sum + g.articles.length, 0)
  const outCount = outOfStockGrouped.value.reduce((sum, g) => sum + g.articles.length, 0)

  return [
    { id: 'all', label: 'Все', count: allCount },
    { id: 'low', label: 'Мало', count: lowCount },
    { id: 'out', label: 'Закончились', count: outCount }
  ]
})

function getActiveFilterClass(filterId: string): string {
  if (filterId === 'low') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold shadow-sm'
  }
  if (filterId === 'out') {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold shadow-sm'
  }
  return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm'
}

function getActiveFilterBadgeClass(filterId: string): string {
  if (filterId === 'low') {
    return 'text-amber-300/80'
  }
  if (filterId === 'out') {
    return 'text-rose-300/80'
  }
  return 'text-emerald-300/70'
}

// Modal states
const isStockModalOpen = ref(false)
const selectedPart = ref<Part | null>(null)
const selectedArticle = ref<PartArticle | null>(null)
const actionType = ref<MovementType>('IN')

const isPartModalOpen = ref(false)
const partToEdit = ref<Part | null>(null)

const isDeleteConfirmOpen = ref(false)
const partToDelete = ref<Part | null>(null)

function openStockModal({ part, type }: { part: Part; type: MovementType }) {
  selectedPart.value = part
  selectedArticle.value = null
  actionType.value = type
  isStockModalOpen.value = true
}

function openReplenishModal(part: Part, article: DeficitArticleItem) {
  haptics.lightTap()
  selectedPart.value = part
  const fullArticle = part.articles?.find(a => a.id === article.id || a.code === article.code) || {
    id: article.id,
    code: article.code,
    name: article.name,
    stock_new: article.stock_new,
    stock_used: article.stock_used,
    min_stock: article.min_stock
  }
  selectedArticle.value = fullArticle
  actionType.value = 'IN'
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
  haptics.lightTap()
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

function exportCurrentListToXLS() {
  haptics.successVibe()
  const today = new Date().toISOString().slice(0, 10)

  if (selectedGroupedList.value.length === 0) {
    toast.add({ title: 'Ничего не выбрано', description: 'Отметьте артикулы галочками для экспорта', color: 'amber' })
    return
  }

  if (partsStore.stockFilter === 'low') {
    const rows: DeficitArticleExportRow[] = []
    for (const g of selectedGroupedList.value) {
      for (const a of g.articles) {
        rows.push({
          partName: g.part.name,
          category: g.part.category || 'Без категории',
          code: a.code,
          articleName: a.name || '',
          stockNew: a.stock_new,
          stockUsed: a.stock_used,
          totalStock: a.totalStock,
          minStock: a.min_stock,
          deficit: a.deficit
        })
      }
    }
    exportLowStockToExcel(rows, `malo_zapchastey_${today}.xlsx`)
    toast.add({ title: 'Файл скачан', description: `Экспортировано ${rows.length} арт. (${selectedGroupedList.value.length} дет.)`, color: 'emerald' })
  } else if (partsStore.stockFilter === 'out') {
    const rows: { partName: string; category: string; code: string; articleName?: string; minStock: number }[] = []
    for (const g of selectedGroupedList.value) {
      for (const a of g.articles) {
        rows.push({
          partName: g.part.name,
          category: g.part.category || 'Без категории',
          code: a.code,
          articleName: a.name || '',
          minStock: a.min_stock
        })
      }
    }
    exportOutOfStockToExcel(rows, `zakonchilis_${today}.xlsx`)
    toast.add({ title: 'Файл скачан', description: `Экспортировано ${rows.length} арт. (${selectedGroupedList.value.length} дет.)`, color: 'emerald' })
  }
}

function copyCurrentListToClipboard() {
  haptics.successVibe()
  const isLow = partsStore.stockFilter === 'low'
  const lines: string[] = []

  selectedGroupedList.value.forEach((g, idx) => {
    lines.push(`${idx + 1}. ${g.part.name}`)

    for (const a of g.articles) {
      const noteStr = a.name ? ` (${a.name})` : ''
      const countNeeded = a.deficit || (a.min_stock && a.min_stock > 0 ? a.min_stock : 1)
      lines.push(`   • ${a.code}${noteStr} - нужно ${countNeeded} шт.`)
    }

    if (idx < selectedGroupedList.value.length - 1) {
      lines.push('')
    }
  })

  if (lines.length === 0) {
    toast.add({ title: 'Ничего не выбрано', description: 'Отметьте артикулы галочками для копирования', color: 'amber' })
    return
  }

  const textToCopy = lines.join('\n')
  copyToClipboard(textToCopy, isLow ? 'Список «Мало»' : 'Список «Закончились»')
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
