<template>
  <UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
    <div class="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
      <!-- Modal Header -->
      <div class="flex items-start justify-between gap-3 mb-4">
        <div>
          <div class="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-primary-400 mb-1">
            {{ part?.code }}
          </div>
          <h2 class="text-base font-bold text-zinc-100">
            {{ part?.name }}
          </h2>
        </div>
        <UButton
          color="gray"
          variant="ghost"
          icon="i-lucide-x"
          size="sm"
          class="text-zinc-400"
          @click="isOpen = false"
        />
      </div>

      <!-- Action Type Selector (Left = Списание, Right = Приход) -->
      <div class="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-4">
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
          :class="type === 'OUT' ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="type = 'OUT'"
        >
          <UIcon name="i-lucide-minus" class="w-4 h-4 text-zinc-400" />
          Списание (-)
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
          :class="type === 'IN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'"
          @click="type = 'IN'"
        >
          <UIcon name="i-lucide-plus" class="w-4 h-4" />
          Приход (+)
        </button>
      </div>

      <!-- Condition Selector (NEW / USED) -->
      <div class="mb-4">
        <label class="block text-xs font-medium text-zinc-400 mb-1.5">
          Состояние запчасти
        </label>
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all"
            :class="condition === 'NEW' ? 'bg-blue-500/20 border-blue-500 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'"
            @click="condition = 'NEW'"
          >
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-blue-500" />
              <span>Новая</span>
            </div>
            <span class="font-mono text-xs text-zinc-400">{{ part?.stock_new || 0 }} шт</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all"
            :class="condition === 'USED' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-zinc-950 border-zinc-800 text-zinc-400'"
            @click="condition = 'USED'"
          >
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500" />
              <span>Б / У</span>
            </div>
            <span class="font-mono text-xs text-zinc-400">{{ part?.stock_used || 0 }} шт</span>
          </button>
        </div>
      </div>

      <!-- Quantity Stepper -->
      <div class="mb-4">
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
            :disabled="quantity <= 1"
            class="h-12 w-12 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700/80 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            @click="quantity > 1 ? quantity-- : null"
          >
            <UIcon name="i-lucide-minus" class="w-5 h-5 stroke-[2.5]" />
          </button>

          <input
            v-model.number="quantity"
            type="number"
            min="1"
            :max="type === 'OUT' ? currentAvailableStock : 9999"
            class="flex-1 h-12 rounded-xl bg-zinc-950 border border-zinc-800 text-center font-mono text-xl font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
          />

          <button
            type="button"
            :disabled="type === 'OUT' && quantity >= currentAvailableStock"
            class="h-12 w-12 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 border border-zinc-700/80 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            @click="quantity++"
          >
            <UIcon name="i-lucide-plus" class="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        <!-- Quick Presets -->
        <div class="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            v-for="preset in [1, 2, 5, 10]"
            :key="preset"
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 active:scale-95 transition-all"
            @click="setPreset(preset)"
          >
            +{{ preset }}
          </button>
          <button
            v-if="type === 'OUT' && currentAvailableStock > 0"
            type="button"
            class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 border border-zinc-700/60 text-amber-400 hover:bg-zinc-700 active:scale-95 transition-all ml-auto"
            @click="quantity = currentAvailableStock"
          >
            Списать все ({{ currentAvailableStock }})
          </button>
        </div>

        <!-- Over-stock warning for OUT -->
        <div
          v-if="type === 'OUT' && quantity > currentAvailableStock"
          class="flex items-center gap-1.5 mt-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
        >
          <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 shrink-0 text-rose-400" />
          <span>Нельзя списать {{ quantity }} шт! В наличии всего {{ currentAvailableStock }} шт.</span>
        </div>
      </div>

      <!-- Reason / Order # -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-zinc-400 mb-1.5">
          Причина / Заказ-наряд
        </label>
        <input
          v-model="reason"
          type="text"
          placeholder="Например: Заказ-наряд #124 или Накладная 45"
          class="w-full h-11 px-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-colors shadow-inner"
        />

        <div class="flex items-center gap-1.5 mt-2 flex-wrap">
          <button
            v-for="chip in quickReasons"
            :key="chip"
            type="button"
            class="px-2 py-0.5 text-[11px] rounded bg-zinc-800/80 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
            @click="reason = chip"
          >
            {{ chip }}
          </button>
        </div>
      </div>

      <!-- Action Button -->
      <button
        type="button"
        :disabled="isSubmitDisabled || isSubmitting"
        class="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
        :class="type === 'IN' ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-zinc-950/40'"
        @click="handleSubmit"
      >
        <UIcon v-if="isSubmitting" name="i-lucide-loader-2" class="w-5 h-5 animate-spin" />
        <span v-if="type === 'IN'">Подтвердить приход (+{{ quantity }} шт)</span>
        <span v-else>Списать со склада (-{{ quantity }} шт)</span>
      </button>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import type { Part, MovementType, PartCondition } from '~/types'
import { usePartsStore } from '~/stores/parts'
import { useTransactionsStore } from '~/stores/transactions'

const props = defineProps<{
  modelValue: boolean
  part: Part | null
  initialType?: MovementType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const partsStore = usePartsStore()
const transStore = useTransactionsStore()
const toast = useToast()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const type = ref<MovementType>('IN')
const condition = ref<PartCondition>('NEW')
const quantity = ref(1)
const reason = ref('')
const isSubmitting = ref(false)

watch(() => props.modelValue, (open) => {
  if (open) {
    type.value = props.initialType || 'IN'
    quantity.value = 1
    reason.value = ''
    // If new stock is 0 and used stock > 0 on OUT, default to USED
    if (type.value === 'OUT' && (props.part?.stock_new || 0) === 0 && (props.part?.stock_used || 0) > 0) {
      condition.value = 'USED'
    } else {
      condition.value = 'NEW'
    }
  }
})

const currentAvailableStock = computed(() => {
  if (!props.part) return 0
  return condition.value === 'NEW' ? props.part.stock_new : props.part.stock_used
})

const isSubmitDisabled = computed(() => {
  if (!props.part || quantity.value <= 0) return true
  if (type.value === 'OUT' && quantity.value > currentAvailableStock.value) return true
  return false
})

const quickReasons = computed(() => {
  if (type.value === 'IN') {
    return ['Приходная накладная', 'Возврат клиента', 'Инвентаризация (+)', 'С другого склада']
  }
  return ['Заказ-наряд', 'Выдача мастеру', 'Брак / Дефект', 'Инвентаризация (-)']
})

function setPreset(amount: number) {
  quantity.value += amount
}

async function handleSubmit() {
  if (!props.part || isSubmitDisabled.value) return

  isSubmitting.value = true
  try {
    const finalReason = reason.value.trim() || (type.value === 'IN' ? 'Поступление на склад' : 'Выдача со склада')

    await partsStore.recordMovement({
      partId: props.part.id,
      type: type.value,
      condition: condition.value,
      quantity: quantity.value,
      reason: finalReason
    })

    await transStore.fetchTransactions()

    toast.add({
      title: type.value === 'IN' ? 'Приход оформлен' : 'Списание оформлено',
      description: `${props.part.code}: ${type.value === 'IN' ? '+' : '-'}${quantity.value} шт (${condition.value === 'NEW' ? 'новые' : 'б/у'})`,
      color: type.value === 'IN' ? 'emerald' : 'rose'
    })

    isOpen.value = false
    emit('success')
  } catch (err: any) {
    toast.add({
      title: 'Ошибка операции',
      description: err.message,
      color: 'red'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
