<template>
  <div class="px-4 py-4 max-w-lg mx-auto pb-28">
    <!-- Top Bar with Back Button & Actions -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 text-xs font-semibold transition-all shadow-sm cursor-pointer"
        @click="goBack"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4 stroke-[2.5]" />
        <span>Назад</span>
      </button>

      <div class="flex items-center gap-2">
        <span
          v-if="part?.category"
          class="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800/90 text-zinc-300 border border-zinc-700/50 truncate max-w-[170px]"
        >
          {{ part.category }}
        </span>

        <UDropdown :items="partMenuItems" :popper="{ placement: 'bottom-end', strategy: 'absolute' }">
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-more-vertical"
            size="sm"
            class="text-zinc-400 hover:text-zinc-100"
          />
        </UDropdown>
      </div>
    </div>

    <!-- If part not found -->
    <div
      v-if="!part"
      class="p-8 text-center bg-zinc-900/60 border border-zinc-800 rounded-2xl mt-8"
    >
      <UIcon name="i-lucide-alert-circle" class="w-10 h-10 text-zinc-500 mx-auto mb-2" />
      <h3 class="text-sm font-bold text-zinc-200 mb-1">Деталь не найдена</h3>
      <p class="text-xs text-zinc-400 mb-4">Возможно, она была удалена.</p>
      <UButton label="В каталог" color="primary" size="sm" @click="goBack" />
    </div>

    <div v-else class="space-y-4">
      <!-- 1. PHOTO SECTION -->
      <div class="relative w-full h-56 sm:h-64 rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden flex items-center justify-center group shadow-inner">
        <!-- Hidden file input -->
        <input
          ref="photoInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handlePhotoSelected"
        />

        <div v-if="isUploadingPhoto" class="flex flex-col items-center justify-center gap-2">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 text-emerald-400 animate-spin" />
          <span class="text-xs text-zinc-400 font-medium">Сжатие и сохранение фото...</span>
        </div>

        <!-- Image present -->
        <template v-else-if="part.image">
          <img
            :src="part.image"
            :alt="part.name"
            class="w-full h-full object-contain p-2"
          />

          <!-- Action buttons overlay -->
          <div class="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-zinc-950/90 via-zinc-950/50 to-transparent flex items-center justify-between gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 active:scale-95 border border-zinc-700/60 text-xs font-semibold text-zinc-200 transition-all shadow-md backdrop-blur-sm cursor-pointer"
              title="Заменить фотографию"
              @click="triggerPhotoPicker"
            >
              <UIcon name="i-lucide-camera" class="w-3.5 h-3.5 text-emerald-400" />
              <span>Заменить фото</span>
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900/90 hover:bg-rose-500/20 active:scale-95 border border-zinc-700/60 hover:border-rose-500/40 text-zinc-400 hover:text-rose-400 transition-all shadow-md backdrop-blur-sm cursor-pointer"
              title="Удалить фотографию"
              @click="removePhoto"
            >
              <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
            </button>
          </div>
        </template>

        <!-- No image placeholder -->
        <template v-else>
          <div
            class="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all w-full h-full"
            @click="triggerPhotoPicker"
          >
            <div class="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-3 shadow-sm group-hover:border-emerald-500/50 group-hover:text-emerald-400 transition-colors">
              <UIcon name="i-lucide-camera" class="w-7 h-7" />
            </div>
            <span class="text-sm font-semibold text-zinc-200 mb-0.5 group-hover:text-emerald-300 transition-colors">
              Загрузить фото детали
            </span>
            <span class="text-xs text-zinc-500">
              Нажмите для выбора из галереи или съемки
            </span>
          </div>
        </template>
      </div>

      <!-- 2. PART NAME -->
      <div class="px-1">
        <h1 class="text-lg sm:text-xl font-bold text-zinc-100 leading-snug">
          {{ part.name }}
        </h1>
      </div>

      <!-- 3. TAGS SECTION -->
      <div class="px-1">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Теги
          </span>
          <button
            type="button"
            class="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            @click="openEditPartModal"
          >
            <UIcon name="i-lucide-pencil" class="w-3 h-3" />
            <span>Изменить</span>
          </button>
        </div>

        <div v-if="displayTags.length > 0" class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in displayTags"
            :key="tag"
            class="inline-block text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 leading-relaxed break-words"
          >
            <span class="text-emerald-500/70 font-mono mr-1 select-none">#</span>{{ tag }}
          </span>
        </div>
        <p v-else class="text-xs text-zinc-500 italic">
          Теги не указаны. Нажмите «Изменить», чтобы добавить модели кофемашин или бренды.
        </p>
      </div>

      <!-- 4. ARTICLES SECTION -->
      <div class="space-y-3">
        <!-- Section Header -->
        <div class="flex items-center justify-between px-1 pt-2">
          <h2 class="text-base font-bold text-zinc-100 flex items-center gap-2">
            <UIcon name="i-lucide-barcode" class="w-5 h-5 text-emerald-400" />
            <span>Артикулы</span>
            <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              {{ part.articles?.length || 0 }}
            </span>
          </h2>
        </div>

        <!-- Articles Blocks List -->
        <div class="space-y-2.5">
          <div
            v-for="article in part.articles"
            :key="article.id"
            class="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-3 shadow-sm hover:border-zinc-700 transition-colors"
          >
            <!-- Article Header: Code + Badges + Actions -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-wrap min-w-0">
                <button
                  type="button"
                  class="h-7 inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 active:scale-95 text-emerald-400 cursor-pointer transition-all border border-zinc-700/70 shrink-0"
                  title="Нажмите, чтобы скопировать артикул"
                  @click="copyToClipboard(article.code, 'Артикул')"
                >
                  <UIcon name="i-lucide-barcode" class="w-3.5 h-3.5" />
                  <span>{{ article.code }}</span>
                </button>

                <!-- Warning badge "Мало" -->
                <span
                  v-if="isArticleLowStock(article)"
                  class="h-7 inline-flex items-center gap-1 font-semibold text-xs px-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 shadow-sm"
                  :title="`Остаток (${getArticleTotalStock(article)} шт) меньше мин. кол-ва с собой (${article.min_stock} шт)`"
                >
                  <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Мало</span>
                </span>
              </div>

              <!-- Article Options -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Редактировать артикул"
                  @click="openEditArticleModal(article)"
                >
                  <UIcon name="i-lucide-pencil" class="w-3.5 h-3.5" />
                </button>
                <button
                  v-if="part.articles.length > 1"
                  type="button"
                  class="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Удалить артикул"
                  @click="confirmDeleteArticle(article)"
                >
                  <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Article Note / Comment: separate line before stock counters -->
            <p
              v-if="article.name"
              class="text-xs text-zinc-400 font-medium leading-snug -mt-1"
            >
              {{ article.name }}
            </p>

            <!-- Stock row: Counters + Action Buttons (Exact compact row style) -->
            <div class="flex items-center gap-2">
              <!-- Stock counters (New vs Used) -->
              <div class="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
                <!-- NEW PARTS -->
                <div class="h-9 flex items-center justify-between px-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <span class="text-xs text-zinc-300 font-medium truncate">Новые:</span>
                  </div>
                  <span class="text-xs font-bold text-blue-400 font-mono ml-1 shrink-0">
                    {{ article.stock_new }} <span class="text-[10px] font-normal text-zinc-500">шт</span>
                  </span>
                </div>

                <!-- USED PARTS -->
                <div class="h-9 flex items-center justify-between px-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span class="text-xs text-zinc-300 font-medium truncate">Б/У:</span>
                  </div>
                  <span class="text-xs font-bold text-amber-400 font-mono ml-1 shrink-0">
                    {{ article.stock_used }} <span class="text-[10px] font-normal text-zinc-500">шт</span>
                  </span>
                </div>
              </div>

              <!-- Quick action round buttons: Списание (-) / Приход (+) -->
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  :disabled="article.stock_new === 0 && article.stock_used === 0"
                  title="Списание"
                  class="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800/80 hover:bg-zinc-700 active:scale-90 border border-zinc-700/80 text-zinc-300 hover:text-zinc-100 shadow-sm transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  @click="openStockModal(article, 'OUT')"
                >
                  <UIcon name="i-lucide-minus" class="w-4 h-4 stroke-[2.5] text-zinc-400" />
                </button>

                <button
                  type="button"
                  title="Приход"
                  class="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-950/40 hover:bg-emerald-900/50 active:scale-90 border border-emerald-500/30 text-emerald-400 shadow-sm transition-all cursor-pointer"
                  @click="openStockModal(article, 'IN')"
                >
                  <UIcon name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. BUTTON TO ADD ARTICLE -->
        <button
          type="button"
          class="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-dashed border-zinc-700 hover:border-emerald-500/60 hover:bg-zinc-900/80 active:scale-[0.99] text-zinc-300 hover:text-emerald-400 text-xs font-bold transition-all shadow-sm cursor-pointer"
          @click="openAddArticleModal"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4 stroke-[2.5]" />
          <span>Добавить артикул к детали</span>
        </button>
      </div>
    </div>

    <!-- Stock In/Out Modal for Specific Article -->
    <StockActionModal
      v-model="isStockModalOpen"
      :part="part"
      :article="selectedArticle"
      :initial-type="actionType"
      @success="handleMovementSuccess"
    />

    <!-- Add / Edit Article Modal -->
    <UModal v-model="isArticleModalOpen">
      <div
        class="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl"
        :style="articleSheetStyle"
      >
        <!-- Mobile Bottom Sheet Drag Handle -->
        <ModalDragHandle class="-mt-3 -mx-5 mb-2" @pointerdown="onArticlePointerDown" />

        <div
          class="flex items-center pb-3 mb-4 border-b border-zinc-800 cursor-grab active:cursor-grabbing touch-none select-none"
          @pointerdown="onArticlePointerDown"
        >
          <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <UIcon :name="isEditingArticle ? 'i-lucide-pencil' : 'i-lucide-plus'" class="w-4 h-4 text-emerald-400" />
            <span>{{ isEditingArticle ? 'Редактировать артикул' : 'Новый артикул' }}</span>
          </h3>
        </div>

        <form @submit.prevent="saveArticle" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">
              Артикул / Каталожный номер *
            </label>
            <input
              v-model="articleForm.code"
              type="text"
              autocapitalize="characters"
              autocorrect="off"
              autocomplete="off"
              spellcheck="false"
              placeholder="Например: 5513214821, ULKA-EX5"
              required
              class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">
              Примечание / Производитель (необязательно)
            </label>
            <input
              v-model="articleForm.name"
              type="text"
              placeholder="Например: Оригинал DeLonghi, Аналог Ceme, 230V"
              class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
            />
          </div>

          <!-- Stock counts -->
          <div class="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
            <div class="text-xs font-bold text-zinc-300 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-boxes" class="w-4 h-4 text-emerald-400" />
                <span>Наличие в рюкзаке</span>
              </div>
              <span class="text-[11px] font-mono text-zinc-400">
                Всего: {{ (Number(articleForm.stock_new) || 0) + (Number(articleForm.stock_used) || 0) }} шт
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-blue-400 mb-1">
                  Новые (шт)
                </label>
                <input
                  v-model.number="articleForm.stock_new"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-mono text-sm font-bold text-blue-400 focus:outline-none focus:border-blue-500 shadow-inner"
                />
              </div>
              <div>
                <label class="block text-[11px] font-medium text-amber-400 mb-1">
                  Б/У (шт)
                </label>
                <input
                  v-model.number="articleForm.stock_used"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  class="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-mono text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          <!-- Minimum stock with me -->
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
              <span>Мин. кол-во деталей с собой</span>
              <span
                v-if="articleForm.min_stock !== null && articleForm.min_stock !== undefined && articleForm.min_stock > 0"
                class="text-[11px] text-amber-400 font-normal"
              >
                порог «Мало»
              </span>
            </label>
            <div class="relative flex items-center">
              <input
                v-model.number="articleForm.min_stock"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                class="w-full h-10 pl-3 pr-8 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
              />
              <span class="absolute right-3 text-xs text-zinc-500 pointer-events-none">шт</span>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <UButton
              color="gray"
              variant="ghost"
              label="Отмена"
              block
              class="flex-1"
              @click="isArticleModalOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              label="Сохранить"
              block
              class="flex-1 font-bold"
            />
          </div>
        </form>
      </div>
    </UModal>

    <!-- Delete Article Confirmation Modal -->
    <UModal v-model="isDeleteArticleConfirmOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div class="flex items-center gap-3 mb-3 text-rose-400">
          <div class="p-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <UIcon name="i-lucide-alert-triangle" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-100">Удалить артикул?</h3>
            <p class="text-xs text-zinc-400">Остаток по этому артикулу будет убран</p>
          </div>
        </div>

        <p class="text-sm text-zinc-300 mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800 font-mono">
          {{ articleToDelete?.code }}
        </p>

        <div class="flex items-center gap-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isDeleteArticleConfirmOpen = false"
          />
          <UButton
            color="rose"
            variant="solid"
            label="Удалить"
            block
            class="flex-1 font-bold"
            @click="executeDeleteArticle"
          />
        </div>
      </div>
    </UModal>

    <!-- Edit Part Modal (reused from components) -->
    <PartModal
      v-model="isEditPartModalOpen"
      :part-to-edit="part"
      @saved="refreshData"
    />

    <!-- Delete Part Confirmation Modal -->
    <UModal v-model="isDeletePartConfirmOpen">
      <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div class="flex items-center gap-3 mb-3 text-rose-400">
          <div class="p-2 rounded-full bg-rose-500/10 border border-rose-500/20">
            <UIcon name="i-lucide-alert-triangle" class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-zinc-100">Удалить деталь?</h3>
            <p class="text-xs text-zinc-400">Это действие нельзя отменить</p>
          </div>
        </div>

        <p class="text-sm text-zinc-300 mb-4 bg-zinc-950 p-3 rounded-lg border border-zinc-800">
          Вы действительно хотите удалить <strong>{{ part?.name }}</strong> со всеми артикулами и историей операций?
        </p>

        <div class="flex items-center gap-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isDeletePartConfirmOpen = false"
          />
          <UButton
            color="rose"
            variant="solid"
            label="Удалить"
            block
            class="flex-1 font-bold"
            @click="executeDeletePart"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Part, PartArticle, MovementType } from '~/types'
import { usePartsStore } from '~/stores/parts'
import { parseTags } from '~/utils/tags'
import { compressImage } from '~/utils/image'

const route = useRoute()
const router = useRouter()
const partsStore = usePartsStore()
const toast = useToast()
const haptics = useHaptics()
const { copyToClipboard: baseCopy } = useClipboardCopy()

function copyToClipboard(text: string, label?: string) {
  haptics.lightTap()
  baseCopy(text, label)
}

const partId = computed(() => Number(route.params.id))
const part = computed<Part | null>(() => {
  return partsStore.parts.find(p => p.id === partId.value) || null
})

const displayTags = computed(() => {
  if (part.value?.tags && part.value.tags.length > 0) {
    return part.value.tags
  }
  return parseTags(part.value?.notes)
})

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

// Photo upload logic
const photoInput = ref<HTMLInputElement | null>(null)
const isUploadingPhoto = ref(false)

function triggerPhotoPicker() {
  photoInput.value?.click()
}

async function handlePhotoSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !part.value) return

  isUploadingPhoto.value = true
  try {
    const base64 = await compressImage(file, 1200, 1200, 0.82)
    await partsStore.updatePartImage(part.value.id, base64)
    toast.add({
      title: 'Фото обновлено',
      description: 'Фотография детали успешно сохранена',
      color: 'emerald'
    })
  } catch (err: any) {
    toast.add({
      title: 'Ошибка загрузки фото',
      description: err.message,
      color: 'red'
    })
  } finally {
    isUploadingPhoto.value = false
    target.value = ''
  }
}

async function removePhoto() {
  if (!part.value) return
  try {
    await partsStore.updatePartImage(part.value.id, '')
    toast.add({
      title: 'Фото удалено',
      color: 'gray'
    })
  } catch (err: any) {
    toast.add({
      title: 'Ошибка удаления фото',
      description: err.message,
      color: 'red'
    })
  }
}

// Stock Action Modal (Movement for specific article)
const isStockModalOpen = ref(false)
const selectedArticle = ref<PartArticle | null>(null)
const actionType = ref<MovementType>('IN')

function openStockModal(article: PartArticle, type: MovementType) {
  haptics.lightTap()
  selectedArticle.value = article
  actionType.value = type
  isStockModalOpen.value = true
}

function handleMovementSuccess() {
  // Store updates reactive part automatically
}

// Article Stock Helpers
function getArticleTotalStock(article: PartArticle): number {
  return (Number(article.stock_new) || 0) + (Number(article.stock_used) || 0)
}

function isArticleLowStock(article: PartArticle): boolean {
  const min = Number(article.min_stock) || 0
  if (min <= 0) return false
  return getArticleTotalStock(article) < min
}

// Add / Edit Article Logic
const isArticleModalOpen = ref(false)

const { sheetStyle: articleSheetStyle, onPointerDown: onArticlePointerDown } = useSwipeDismiss({
  onDismiss: () => {
    isArticleModalOpen.value = false
  },
  isOpen: isArticleModalOpen
})

const isEditingArticle = ref(false)
const editingArticleId = ref<string | null>(null)
const articleForm = reactive({
  code: '',
  name: '',
  stock_new: 0,
  stock_used: 0,
  min_stock: null as number | null
})

function openAddArticleModal() {
  haptics.lightTap()
  isEditingArticle.value = false
  editingArticleId.value = null
  articleForm.code = ''
  articleForm.name = ''
  articleForm.stock_new = 0
  articleForm.stock_used = 0
  articleForm.min_stock = null
  isArticleModalOpen.value = true
}

function openEditArticleModal(article: PartArticle) {
  haptics.lightTap()
  isEditingArticle.value = true
  editingArticleId.value = article.id
  articleForm.code = article.code
  articleForm.name = article.name || ''
  articleForm.stock_new = article.stock_new
  articleForm.stock_used = article.stock_used
  articleForm.min_stock = article.min_stock !== undefined && article.min_stock > 0 ? article.min_stock : null
  isArticleModalOpen.value = true
}

async function saveArticle() {
  if (!part.value || !articleForm.code.trim()) return

  const minStockVal = articleForm.min_stock !== null && articleForm.min_stock !== undefined
    ? Math.max(0, Number(articleForm.min_stock) || 0)
    : 0

  try {
    if (isEditingArticle.value && editingArticleId.value) {
      await partsStore.updateArticle(part.value.id, editingArticleId.value, {
        code: articleForm.code.trim(),
        name: articleForm.name.trim(),
        stock_new: Math.max(0, Number(articleForm.stock_new) || 0),
        stock_used: Math.max(0, Number(articleForm.stock_used) || 0),
        min_stock: minStockVal
      })
      haptics.successVibe()
      toast.add({
        title: 'Артикул обновлен',
        description: articleForm.code,
        color: 'emerald'
      })
    } else {
      await partsStore.addArticle(part.value.id, {
        code: articleForm.code.trim(),
        name: articleForm.name.trim(),
        stock_new: Math.max(0, Number(articleForm.stock_new) || 0),
        stock_used: Math.max(0, Number(articleForm.stock_used) || 0),
        min_stock: minStockVal
      })
      haptics.successVibe()
      toast.add({
        title: 'Артикул добавлен',
        description: articleForm.code,
        color: 'emerald'
      })
    }
    isArticleModalOpen.value = false
  } catch (err: any) {
    haptics.errorVibe()
    toast.add({
      title: 'Ошибка сохранения артикула',
      description: err.message,
      color: 'red'
    })
  }
}

// Delete Article Logic
const isDeleteArticleConfirmOpen = ref(false)
const articleToDelete = ref<PartArticle | null>(null)

function confirmDeleteArticle(article: PartArticle) {
  haptics.mediumTap()
  articleToDelete.value = article
  isDeleteArticleConfirmOpen.value = true
}

async function executeDeleteArticle() {
  if (!part.value || !articleToDelete.value) return
  try {
    const code = articleToDelete.value.code
    await partsStore.deleteArticle(part.value.id, articleToDelete.value.id)
    haptics.mediumTap()
    toast.add({
      title: 'Артикул удален',
      description: code,
      color: 'gray'
    })
    isDeleteArticleConfirmOpen.value = false
  } catch (err: any) {
    haptics.errorVibe()
    toast.add({
      title: 'Ошибка удаления',
      description: err.message,
      color: 'red'
    })
  }
}

// Edit Part Info
const isEditPartModalOpen = ref(false)
function openEditPartModal() {
  haptics.lightTap()
  isEditPartModalOpen.value = true
}

// Delete Part
const isDeletePartConfirmOpen = ref(false)
function confirmDeletePart() {
  haptics.mediumTap()
  isDeletePartConfirmOpen.value = true
}

async function executeDeletePart() {
  if (!part.value) return
  try {
    const name = part.value.name
    await partsStore.deletePart(part.value.id)
    haptics.mediumTap()
    toast.add({
      title: 'Деталь удалена',
      description: name,
      color: 'gray'
    })
    isDeletePartConfirmOpen.value = false
    navigateTo('/')
  } catch (err: any) {
    haptics.errorVibe()
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

const partMenuItems = computed(() => [
  [
    {
      label: 'Редактировать деталь',
      icon: 'i-lucide-pencil',
      click: () => openEditPartModal()
    },
    {
      label: 'Удалить деталь',
      icon: 'i-lucide-trash-2',
      click: () => confirmDeletePart()
    }
  ]
])
</script>
