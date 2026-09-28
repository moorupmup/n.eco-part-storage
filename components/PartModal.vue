<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-lg' }">
    <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl max-h-[85vh] overflow-y-auto">
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
        <!-- Article / Code -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">
            Артикул / Каталожный код *
          </label>
          <input
            v-model="form.code"
            type="text"
            placeholder="ULKA-EX5, 5513214821..."
            required
            class="w-full h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />
        </div>

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
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <button
              v-for="cat in availableCategories"
              :key="cat"
              type="button"
              class="px-2.5 py-1 text-[11px] rounded-lg border transition-all"
              :class="form.category === cat ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold' : 'bg-zinc-800 border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700'"
              @click="form.category = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Stock in backpack -->
        <div class="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
          <div class="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <UIcon name="i-lucide-backpack" class="w-4 h-4 text-emerald-400" />
            Наличие в рюкзаке
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-blue-400 mb-1">
                Новые (шт)
              </label>
              <input
                v-model.number="form.stock_new"
                type="number"
                min="0"
                class="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-mono text-sm font-bold text-blue-400 focus:outline-none focus:border-blue-500 shadow-inner"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-amber-400 mb-1">
                Б/У (шт)
              </label>
              <input
                v-model.number="form.stock_used"
                type="number"
                min="0"
                class="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-center font-mono text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>
        </div>


        <!-- Notes -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1">
            Примечание / Совместимость
          </label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Модели кофемашин, дефекты, нюансы..."
            class="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors shadow-inner resize-none"
          />
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

const props = defineProps<{
  modelValue: boolean
  partToEdit: Part | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const partsStore = usePartsStore()
const toast = useToast()

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
    } else {
      form.code = ''
      form.name = ''
      form.category = ''
      form.location = ''
      form.stock_new = 0
      form.stock_used = 0
      form.min_stock = 0
      form.price_new = 0
      form.price_used = 0
      form.notes = ''
    }
  }
})

async function handleSave() {
  if (!form.code.trim() || !form.name.trim()) return

  isSaving.value = true
  try {
    if (isEdit.value && props.partToEdit) {
      await partsStore.updatePart(props.partToEdit.id, { ...form })
      toast.add({
        title: 'Запчасть обновлена',
        description: form.name,
        color: 'emerald'
      })
    } else {
      await partsStore.addPart({ ...form })
      toast.add({
        title: 'Запчасть добавлена',
        description: form.name,
        color: 'emerald'
      })
    }

    isOpen.value = false
    emit('saved')
  } catch (err: any) {
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
