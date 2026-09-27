import { defineStore } from 'pinia'
import { dbService } from '~/services/database'
import type { Part, MovementType, PartCondition, InventoryStats } from '~/types'

interface PartsState {
  parts: Part[]
  searchQuery: string
  selectedCategory: string
  stockFilter: 'all' | 'low' | 'out' | 'in_stock'
  isLoading: boolean
  error: string | null
}

export const usePartsStore = defineStore('parts', {
  state: (): PartsState => ({
    parts: [],
    searchQuery: '',
    selectedCategory: 'all',
    stockFilter: 'all',
    isLoading: false,
    error: null
  }),

  getters: {
    categories: (state): string[] => {
      const set = new Set<string>()
      state.parts.forEach(p => {
        if (p.category && p.category.trim()) {
          set.add(p.category.trim())
        }
      })
      return Array.from(set).sort()
    },

    filteredParts: (state): Part[] => {
      let result = [...state.parts]

      // Search by code, name, location
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim()
        result = result.filter(p =>
          p.code.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query) ||
          (p.location && p.location.toLowerCase().includes(query)) ||
          (p.notes && p.notes.toLowerCase().includes(query))
        )
      }

      // Filter by category
      if (state.selectedCategory !== 'all') {
        result = result.filter(p => p.category === state.selectedCategory)
      }

      // Filter by stock level
      if (state.stockFilter === 'low') {
        result = result.filter(p => (p.stock_new + p.stock_used) <= p.min_stock && (p.stock_new + p.stock_used) > 0)
      } else if (state.stockFilter === 'out') {
        result = result.filter(p => (p.stock_new + p.stock_used) === 0)
      } else if (state.stockFilter === 'in_stock') {
        result = result.filter(p => (p.stock_new + p.stock_used) > 0)
      }

      return result
    },

    lowStockParts: (state): (Part & { deficit: number; totalStock: number })[] => {
      return state.parts
        .map(p => {
          const totalStock = p.stock_new + p.stock_used
          const deficit = Math.max(0, p.min_stock - totalStock)
          return {
            ...p,
            totalStock,
            deficit: (totalStock <= p.min_stock && p.min_stock > 0) || totalStock === 0 ? Math.max(1, p.min_stock - totalStock) : 0
          }
        })
        .filter(p => (p.totalStock <= p.min_stock && p.min_stock > 0) || p.totalStock === 0)
        .sort((a, b) => b.deficit - a.deficit)
    },

    stats: (state): InventoryStats => {
      let totalNewQuantity = 0
      let totalUsedQuantity = 0
      let lowStockPositions = 0

      for (const p of state.parts) {
        totalNewQuantity += p.stock_new
        totalUsedQuantity += p.stock_used
        const totalStock = p.stock_new + p.stock_used
        if ((p.min_stock > 0 && totalStock <= p.min_stock) || totalStock === 0) {
          lowStockPositions++
        }
      }

      return {
        totalPositions: state.parts.length,
        totalNewQuantity,
        totalUsedQuantity,
        lowStockPositions
      }
    }
  },

  actions: {
    async fetchParts() {
      this.isLoading = true
      this.error = null
      try {
        this.parts = await dbService.getAllParts()
      } catch (err: any) {
        this.error = err.message || 'Ошибка загрузки запчастей'
      } finally {
        this.isLoading = false
      }
    },

    async addPart(payload: Omit<Part, 'id' | 'created_at' | 'updated_at'>) {
      this.isLoading = true
      try {
        const newPart = await dbService.createPart(payload)
        this.parts.unshift(newPart)
        return newPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updatePart(id: number, payload: Partial<Omit<Part, 'id' | 'created_at' | 'updated_at'>>) {
      this.isLoading = true
      try {
        await dbService.updatePart(id, payload)
        const index = this.parts.findIndex(p => p.id === id)
        if (index !== -1) {
          this.parts[index] = { ...this.parts[index], ...payload, updated_at: new Date().toISOString() }
        }
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deletePart(id: number) {
      this.isLoading = true
      try {
        await dbService.deletePart(id)
        this.parts = this.parts.filter(p => p.id !== id)
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async recordMovement(params: {
      partId: number
      type: MovementType
      condition: PartCondition
      quantity: number
      reason: string
    }) {
      this.isLoading = true
      try {
        const { part, transaction } = await dbService.recordMovement(params)
        const index = this.parts.findIndex(p => p.id === params.partId)
        if (index !== -1) {
          this.parts[index] = part
        }
        return { part, transaction }
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    }
  }
})
