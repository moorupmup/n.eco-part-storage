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
        <!-- Article / Code & Location -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">
              Артикул / Код *
            </label>
            <UInput
              v-model="form.code"
              placeholder="04465-33450"
              required
              size="md"
              class="font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-zinc-300 mb-1">
              Ячейка / Место
            </label>
            <UInput
              v-model="form.location"
              placeholder="Стеллаж A-1"
              size="md"
            />
          </div>
        </div>

        <!-- Name -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">
            Наименование детали *
          </label>
          <UInput
            v-model="form.name"
            placeholder="Колодки тормозные передние"
            required
            size="md"
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-xs font-semibold text-zinc-300 mb-1">
            Категория / Узел
          </label>
          <UInput
            v-model="form.category"
            placeholder="Тормозная система, Двигатель..."
            size="md"
          />
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <button
              v-for="cat in commonCategories"
              :key="cat"
              type="button"
              class="px-2 py-0.5 text-[11px] rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              @click="form.category = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Stock and Min Stock -->
        <div class="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
          <div class="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <UIcon name="i-lucide-boxes" class="w-4 h-4 text-primary-400" />
            Остатки на складе
          </div>

          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="block text-[11px] font-medium text-blue-400 mb-1">
                Новые (шт)
              </label>
              <UInput
                v-model.number="form.stock_new"
                type="number"
                min="0"
                size="md"
                class="font-mono text-center"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-amber-400 mb-1">
                Б / У (шт)
              </label>
              <UInput
                v-model.number="form.stock_used"
                type="number"
                min="0"
                size="md"
                class="font-mono text-center"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-rose-400 mb-1">
                Мин. остаток
              </label>
              <UInput
                v-model.number="form.min_stock"
                type="number"
                min="0"
                size="md"
                class="font-mono text-center"
              />
            </div>
          </div>
          <p class="text-[10px] text-zinc-500">
            * Минимальный остаток используется для автоматического формирования списка на заказ/выдачу.
          </p>
        </div>

        <!-- Prices (Optional) -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1">
              Цена новой (₽)
            </label>
            <UInput
              v-model.number="form.price_new"
              type="number"
              min="0"
              size="md"
              placeholder="0"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1">
              Цена б/у (₽)
            </label>
            <UInput
              v-model.number="form.price_used"
              type="number"
              min="0"
              size="md"
              placeholder="0"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-medium text-zinc-400 mb-1">
            Примечание / Совместимость
          </label>
          <UTextarea
            v-model="form.notes"
            rows="2"
            placeholder="Модели авто, кросс-номера, дефекты..."
            size="md"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <UButton
            color="gray"
            variant="ghost"
            label="Отмена"
            block
            class="flex-1"
            @click="isOpen = false"
          />
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            :loading="isSaving"
            label="Сохранить"
            block
            class="flex-1 font-bold"
          />
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

const commonCategories = ['Двигатель', 'Тормозная система', 'Подвеска', 'Электрика', 'Кузов', 'Фильтры / ТО', 'Трансмиссия']

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
      form.min_stock = 2
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
