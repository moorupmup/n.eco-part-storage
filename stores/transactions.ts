import { defineStore } from 'pinia'
import { dbService } from '~/services/database'
import type { Transaction, MovementType } from '~/types'

interface TransactionsState {
  transactions: Transaction[]
  selectedPartId: number | null
  selectedType: MovementType | 'ALL'
  dateFrom: string
  dateTo: string
  isLoading: boolean
  error: string | null
}

export const useTransactionsStore = defineStore('transactions', {
  state: (): TransactionsState => ({
    transactions: [],
    selectedPartId: null,
    selectedType: 'ALL',
    dateFrom: '',
    dateTo: '',
    isLoading: false,
    error: null
  }),

  getters: {
    filteredTransactions: (state): Transaction[] => {
      let list = [...state.transactions]

      if (state.selectedPartId) {
        list = list.filter(t => t.part_id === state.selectedPartId)
      }

      if (state.selectedType !== 'ALL') {
        list = list.filter(t => t.type === state.selectedType)
      }

      if (state.dateFrom) {
        const from = new Date(state.dateFrom).getTime()
        list = list.filter(t => new Date(t.created_at).getTime() >= from)
      }

      if (state.dateTo) {
        const to = new Date(state.dateTo).setHours(23, 59, 59, 999)
        list = list.filter(t => new Date(t.created_at).getTime() <= to)
      }

      return list
    }
  },

  actions: {
    async fetchTransactions() {
      this.isLoading = true
      this.error = null
      try {
        this.transactions = await dbService.getTransactions({
          partId: this.selectedPartId || undefined,
          type: this.selectedType === 'ALL' ? undefined : this.selectedType,
          dateFrom: this.dateFrom || undefined,
          dateTo: this.dateTo || undefined
        })
      } catch (err: any) {
        this.error = err.message || 'Ошибка загрузки истории операций'
      } finally {
        this.isLoading = false
      }
    },

    setPartFilter(partId: number | null) {
      this.selectedPartId = partId
    },

    setTypeFilter(type: MovementType | 'ALL') {
      this.selectedType = type
    },

    setDateRange(from: string, to: string) {
      this.dateFrom = from
      this.dateTo = to
    },

    resetFilters() {
      this.selectedPartId = null
      this.selectedType = 'ALL'
      this.dateFrom = ''
      this.dateTo = ''
      this.fetchTransactions()
    }
  }
})
