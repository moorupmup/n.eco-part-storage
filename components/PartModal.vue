<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-lg' }">
    <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl max-h-[85vh] overflow-y-auto">
      <!-- Mobile Bottom Sheet Drag Handle -->
      <div class="w-10 h-1 rounded-full bg-zinc-700/80 mx-auto -mt-1 mb-3.5" />

      <div class="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
        <h2 class="text-base font-bold text-zinc-100 flex items-center gap-2">
          <UIcon :name="isEdit ? 'i-lucide-pencil' : 'i-lucide-plus-circle'" class="w-5 h-5 text-primary-400" />
          {{ isEdit ? 'Редактировать запчасть' : 'Новая запчасть' }}
        </h2>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-lucide-x"
          size="sm"
          class="text-zinc-400"
          @click="isOpen = false"
        />
      </div>

      <form @submit.prevent="handleSave" class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">
            Наименование детали *
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Помпа вибрационная Ulka EX5 (48W, 230V)"
            required
            class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">
            Категория / Узел
          </label>
          <input
            v-model="form.category"
            type="text"
            placeholder="Помпы / Насосы, Заварочный блок..."
            class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
          <div class="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-1">
            <button
              v-for="cat in availableCategories"
              :key="cat"
              type="button"
              class="px-2.5 py-1 text-[11px] rounded-lg border transition-all shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
              :class="form.category === cat ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm' : 'bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700'"
              @click="toggleCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Tags System -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
            <UIcon name="i-lucide-tags" class="w-4 h-4 text-emerald-400" />
            <span>Теги</span>
          </label>

          <!-- Current Selected Tags Chips -->
          <div v-if="tags.length > 0" class="flex flex-wrap gap-1.5 mb-2.5">
            <span
              v-for="(tag, idx) in tags"
              :key="tag"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
            >
              <span class="text-emerald-500/70 text-[11px] font-mono">#</span>
              <span>{{ tag }}</span>
              <button
                type="button"
                class="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-emerald-500/30 text-emerald-400/80 hover:text-emerald-200 transition-colors"
                title="Удалить тег"
                @click="removeTag(idx)"
              >
                <UIcon name="i-lucide-x" class="w-3 h-3" />
              </button>
            </span>
          </div>

          <!-- Add Tag Input Row with Autocomplete -->
          <div class="relative flex items-center gap-2">
            <div class="relative flex-1 min-w-0">
              <span class="absolute left-3 top-2.5 text-zinc-500 font-mono text-sm pointer-events-none">#</span>
              <input
                v-model="newTagInput"
                type="text"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="done"
                placeholder="Добавить тег..."
                maxlength="30"
                class="w-full h-10 pl-7 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
                @focus="isAutocompleteOpen = true"
                @blur="onInputBlur"
                @input="isAutocompleteOpen = true; activeSuggestionIndex = -1"
                @keydown="handleTagKeydown"
              />

              <!-- Autocomplete Dropdown from existing catalog tags -->
              <div
                v-if="isAutocompleteOpen && autocompleteSuggestions.length > 0"
                class="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto no-scrollbar py-1"
              >
                <button
                  v-for="(sug, idx) in autocompleteSuggestions"
                  :key="sug"
                  type="button"
                  :disabled="isTagAlreadyAdded(sug)"
                  class="w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors border-b border-zinc-800/40 last:border-b-0"
                  :class="[
                    isTagAlreadyAdded(sug)
                      ? 'opacity-60 bg-zinc-950/40 text-zinc-400 cursor-default'
                      : idx === activeSuggestionIndex
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold cursor-pointer'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-emerald-300 cursor-pointer'
                  ]"
                  @pointerdown.prevent
                  @click="!isTagAlreadyAdded(sug) && selectSuggestion(sug)"
                >
                  <span class="flex items-center gap-1.5 truncate">
                    <span class="text-emerald-500/70 font-mono text-[11px]">#</span>
                    <span class="truncate">{{ sug }}</span>
                  </span>
                  <span v-if="isTagAlreadyAdded(sug)" class="text-[10px] text-emerald-400/90 flex items-center gap-1 shrink-0 ml-2">
                    <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
                    <span>добавлен</span>
                  </span>
                  <UIcon v-else name="i-lucide-plus" class="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-2" />
                </button>
              </div>
            </div>

            <button
              type="button"
              :disabled="!newTagInput.trim()"
              class="h-10 px-3 flex items-center justify-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-semibold text-zinc-200 disabled:opacity-30 disabled:pointer-events-none border border-zinc-700/60 transition-all shrink-0"
              @click="addTagFromInput"
            >
              <UIcon name="i-lucide-plus" class="w-4 h-4 text-emerald-400" />
              <span>Тег</span>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <button
            type="button"
            class="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm transition-all"
            @click="isOpen = false"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="isSaving"
            class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <UIcon v-if="isSaving" name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
            <span>Сохранить</span>
          </button>
        </div>
      </form>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { Part } from '~/types'
import { usePartsStore } from '~/stores/parts'
import { parseTags, serializeTags } from '~/utils/tags'

const props = defineProps<{
  modelValue: boolean
  partToEdit: Part | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', part?: Part): void
}>()

const partsStore = usePartsStore()
const toast = useToast()
const haptics = useHaptics()

function toggleCategory(cat: string) {
  haptics.lightTap()
  form.category = form.category === cat ? '' : cat
}

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.partToEdit)
const isSaving = ref(false)

const availableCategories = computed(() => partsStore.categories)

const form = reactive({
  code: '',
  name: '',
  category: '',
  location: '',
  stock_new: 0,
  stock_used: 0,
  min_stock: 0,
  price_new: 0,
  price_used: 0,
  notes: ''
})

// Tags management & Autocomplete
const tags = ref<string[]>([])
const newTagInput = ref('')
const isAutocompleteOpen = ref(false)
const activeSuggestionIndex = ref(-1)

function isTagAlreadyAdded(tag: string): boolean {
  const lower = tag.trim().toLowerCase()
  return tags.value.some(t => t.toLowerCase() === lower)
}

const allExistingTags = computed(() => {
  const set = new Set<string>()
  for (const t of partsStore.allTags || []) {
    if (t && typeof t === 'string' && t.trim()) set.add(t.trim())
  }
  for (const t of tags.value || []) {
    if (t && typeof t === 'string' && t.trim()) set.add(t.trim())
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
})

const autocompleteSuggestions = computed(() => {
  const query = newTagInput.value.trim().replace(/^#+/, '').toLowerCase()
  if (!query) return []

  return allExistingTags.value
    .filter(tag => tag.toLowerCase().includes(query))
    .sort((a, b) => {
      // Prioritize tags starting with the query
      const aStarts = a.toLowerCase().startsWith(query)
      const bStarts = b.toLowerCase().startsWith(query)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return a.localeCompare(b, 'ru')
    })
    .slice(0, 10)
})

function selectSuggestion(tag: string) {
  if (!isTagAlreadyAdded(tag)) {
    addTag(tag)
  }
  newTagInput.value = ''
  isAutocompleteOpen.value = false
  activeSuggestionIndex.value = -1
}

function onInputBlur() {
  setTimeout(() => {
    isAutocompleteOpen.value = false
    activeSuggestionIndex.value = -1
  }, 250)
}

function handleTagKeydown(e: KeyboardEvent) {
  if (isAutocompleteOpen.value && autocompleteSuggestions.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeSuggestionIndex.value = (activeSuggestionIndex.value + 1) % autocompleteSuggestions.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeSuggestionIndex.value = (activeSuggestionIndex.value - 1 + autocompleteSuggestions.value.length) % autocompleteSuggestions.value.length
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      isAutocompleteOpen.value = false
      activeSuggestionIndex.value = -1
      return
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && activeSuggestionIndex.value >= 0) {
      const selected = autocompleteSuggestions.value[activeSuggestionIndex.value]
      if (selected) {
        e.preventDefault()
        selectSuggestion(selected)
        return
      }
    }
  }

  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTagFromInput()
  }
}

function addTagFromInput() {
  const val = newTagInput.value.trim().replace(/^#+/, '')
  if (!val) return
  const parts = val.split(/[,;\n]/).map(t => t.trim().replace(/^#+/, '')).filter(Boolean)
  for (const p of parts) {
    addTag(p)
  }
  newTagInput.value = ''
  isAutocompleteOpen.value = false
  activeSuggestionIndex.value = -1
}

function addTag(tag: string) {
  const clean = tag.trim().replace(/^#+/, '')
  if (!clean) return
  if (!tags.value.some(t => t.toLowerCase() === clean.toLowerCase())) {
    haptics.lightTap()
    tags.value.push(clean)
  }
}

function removeTag(index: number) {
  haptics.lightTap()
  tags.value.splice(index, 1)
}

watch(() => props.modelValue, (open) => {
  if (open) {
    if (props.partToEdit) {
      form.code = props.partToEdit.code
      form.name = props.partToEdit.name
      form.category = props.partToEdit.category || ''
      form.location = props.partToEdit.location || ''
      form.stock_new = props.partToEdit.stock_new || 0
      form.stock_used = props.partToEdit.stock_used || 0
      form.min_stock = props.partToEdit.min_stock || 0
      form.price_new = props.partToEdit.price_new || 0
      form.price_used = props.partToEdit.price_used || 0
      form.notes = props.partToEdit.notes || ''
      tags.value = parseTags(props.partToEdit.tags || props.partToEdit.notes)
    } else {
      form.code = ''
      form.name = ''
      form.category = (partsStore.selectedCategory && partsStore.selectedCategory !== 'all') ? partsStore.selectedCategory : ''
      form.location = ''
      form.stock_new = 0
      form.stock_used = 0
      form.min_stock = 0
      form.price_new = 0
      form.price_used = 0
      form.notes = ''
      tags.value = []
    }
    newTagInput.value = ''
    isAutocompleteOpen.value = false
    activeSuggestionIndex.value = -1
  }
})

async function handleSave() {
  if (!form.name.trim()) return

  isSaving.value = true
  try {
    const serialized = serializeTags(tags.value)
    const payload = {
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      notes: serialized,
      tags: [...tags.value]
    }

    let savedPart: Part | undefined

    if (isEdit.value && props.partToEdit) {
      await partsStore.updatePart(props.partToEdit.id, {
        ...payload,
        articles: props.partToEdit.articles,
        image: props.partToEdit.image
      })
      savedPart = {
        ...props.partToEdit,
        ...payload
      }
      toast.add({
        title: 'Запчасть обновлена',
        description: form.name,
        color: 'emerald'
      })
    } else {
      savedPart = await partsStore.addPart(payload)
      toast.add({
        title: 'Запчасть добавлена',
        description: form.name,
        color: 'emerald'
      })
    }

    haptics.successVibe()
    isOpen.value = false
    emit('saved', savedPart)
  } catch (err: any) {
    haptics.errorVibe()
    toast.add({
      title: 'Ошибка',
      description: err.message,
      color: 'red'
    })
  } finally {
    isSaving.value = false
  }
}
</script>
