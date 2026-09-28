import { defineStore } from 'pinia'
import { dbService } from '~/services/database'
import type { Part, MovementType, PartCondition, InventoryStats, Category, CategoryWithStats } from '~/types'
import { parseTags } from '~/utils/tags'

interface PartsState {
  parts: Part[]
  categoriesList: Category[]
  searchQuery: string
  selectedCategory: string
  stockFilter: 'all' | 'in_stock' | 'out'
  isLoading: boolean
  error: string | null
}

export const usePartsStore = defineStore('parts', {
  state: (): PartsState => ({
    parts: [],
    categoriesList: [],
    searchQuery: '',
    selectedCategory: 'all',
    stockFilter: 'all',
    isLoading: false,
    error: null
  }),

  getters: {
    categories: (state): string[] => {
      const set = new Set<string>()
      state.categoriesList.forEach(c => set.add(c.name))
      state.parts.forEach(p => {
        if (p.category && p.category.trim()) {
          set.add(p.category.trim())
        }
      })
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
    },

    categoriesWithStats: (state): CategoryWithStats[] => {
      const map = new Map<string, { partsCount: number; totalNew: number; totalUsed: number }>()

      for (const p of state.parts) {
        const cat = (p.category || '').trim()
        if (!cat) continue
        const cur = map.get(cat.toLowerCase()) || { partsCount: 0, totalNew: 0, totalUsed: 0 }
        cur.partsCount += 1
        cur.totalNew += p.stock_new
        cur.totalUsed += p.stock_used
        map.set(cat.toLowerCase(), cur)
      }

      return state.categoriesList.map(c => {
        const stats = map.get(c.name.toLowerCase()) || { partsCount: 0, totalNew: 0, totalUsed: 0 }
        return {
          id: c.id,
          name: c.name,
          created_at: c.created_at,
          partsCount: stats.partsCount,
          totalNew: stats.totalNew,
          totalUsed: stats.totalUsed
        }
      }).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    },

    allTags: (state): string[] => {
      const set = new Set<string>()
      for (const p of state.parts) {
        if (!p) continue
        if (Array.isArray(p.tags) && p.tags.length > 0) {
          p.tags.forEach(t => {
            const clean = typeof t === 'string' ? t.trim() : ''
            if (clean) set.add(clean)
          })
        }
        if (p.notes) {
          parseTags(p.notes).forEach(t => {
            const clean = typeof t === 'string' ? t.trim() : ''
            if (clean) set.add(clean)
          })
        }
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'ru'))
    },

    filteredParts: (state): Part[] => {
      let result = (state.parts || []).filter(p => !!p)

      // Search by code, name, tags, notes
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim()
        result = result.filter(p =>
          (p.code && p.code.toLowerCase().includes(query)) ||
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.notes && p.notes.toLowerCase().includes(query)) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(query)))
        )
      }

      // Filter by category
      if (state.selectedCategory !== 'all') {
        result = result.filter(p => p.category === state.selectedCategory)
      }

      // Filter by stock level
      if (state.stockFilter === 'out') {
        result = result.filter(p => ((p.stock_new || 0) + (p.stock_used || 0)) === 0)
      } else if (state.stockFilter === 'in_stock') {
        result = result.filter(p => ((p.stock_new || 0) + (p.stock_used || 0)) > 0)
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
        const [parts, categories] = await Promise.all([
          dbService.getAllParts(),
          dbService.getAllCategories()
        ])
        this.parts = parts
        this.categoriesList = categories
      } catch (err: any) {
        this.error = err.message || 'Ошибка загрузки запчастей'
      } finally {
        this.isLoading = false
      }
    },

    async fetchCategories() {
      try {
        this.categoriesList = await dbService.getAllCategories()
      } catch (err: any) {
        console.error('Failed to load categories:', err)
      }
    },

    async addCategory(name: string) {
      this.isLoading = true
      try {
        const newCat = await dbService.createCategory(name)
        this.categoriesList.push(newCat)
        return newCat
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async renameCategory(oldName: string, newName: string) {
      this.isLoading = true
      try {
        await dbService.renameCategory(oldName, newName)
        const cat = this.categoriesList.find(c => c.name.toLowerCase() === oldName.toLowerCase())
        if (cat) cat.name = newName.trim()

        for (const p of this.parts) {
          if (p.category && p.category.toLowerCase().trim() === oldName.toLowerCase().trim()) {
            p.category = newName.trim()
          }
        }
        if (this.selectedCategory.toLowerCase() === oldName.toLowerCase()) {
          this.selectedCategory = newName.trim()
        }
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteCategory(name: string) {
      this.isLoading = true
      try {
        await dbService.deleteCategory(name)
        this.categoriesList = this.categoriesList.filter(c => c.name.toLowerCase() !== name.toLowerCase())
        for (const p of this.parts) {
          if (p.category && p.category.toLowerCase().trim() === name.toLowerCase().trim()) {
            p.category = ''
          }
        }
        if (this.selectedCategory.toLowerCase() === name.toLowerCase()) {
          this.selectedCategory = 'all'
        }
      } catch (err: any) {
        this.error = err.message
        throw err
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
