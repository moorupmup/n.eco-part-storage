import { defineStore } from 'pinia'
import { dbService } from '~/services/database'
import type { Part, PartArticle, MovementType, PartCondition, InventoryStats, Category, CategoryWithStats } from '~/types'
import { parseTags } from '~/utils/tags'
import { useNativeWidget } from '~/composables/useNativeWidget'

interface PartsState {
  parts: Part[]
  categoriesList: Category[]
  searchQuery: string
  selectedCategory: string
  stockFilter: 'all' | 'low' | 'out' | 'in_stock'
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

      // Search by code, name, tags, notes, articles
      if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim()
        result = result.filter(p =>
          (p.code && p.code.toLowerCase().includes(query)) ||
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.notes && p.notes.toLowerCase().includes(query)) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
          (Array.isArray(p.articles) && p.articles.some(a => a.code.toLowerCase().includes(query) || (a.name && a.name.toLowerCase().includes(query))))
        )
      }

      // Filter by category
      if (state.selectedCategory !== 'all') {
        result = result.filter(p => p.category === state.selectedCategory)
      }

      // Filter by stock level
      if (state.stockFilter === 'out') {
        result = result.filter(p =>
          ((p.stock_new || 0) + (p.stock_used || 0)) === 0 ||
          (p.articles && p.articles.some(a => ((Number(a.stock_new) || 0) + (Number(a.stock_used) || 0)) === 0))
        )
      } else if (state.stockFilter === 'low') {
        result = result.filter(p =>
          p.articles && p.articles.some(a => {
            const min = Number(a.min_stock) || 0
            const total = (Number(a.stock_new) || 0) + (Number(a.stock_used) || 0)
            return min > 0 && total < min
          })
        )
      } else if (state.stockFilter === 'in_stock') {
        result = result.filter(p => ((p.stock_new || 0) + (p.stock_used || 0)) > 0)
      }

      return result
    },

    lowStockParts: (state): (Part & { deficit: number; totalStock: number })[] => {
      return state.parts
        .map(p => {
          let minStock = 0
          const totalStock = (Number(p.stock_new) || 0) + (Number(p.stock_used) || 0)
          if (Array.isArray(p.articles) && p.articles.length > 0) {
            minStock = p.articles.reduce((sum, a) => {
              const aMin = Number(a.min_stock) || 0
              return aMin > 0 ? sum + aMin : sum
            }, 0)
          } else {
            minStock = Number(p.min_stock) || 0
          }
          const deficit = (minStock > 0 && totalStock < minStock) ? (minStock - totalStock) : 0
          return {
            ...p,
            totalStock,
            deficit
          }
        })
        .filter(p => p.deficit > 0)
        .sort((a, b) => b.deficit - a.deficit)
    },

    stats: (state): InventoryStats => {
      let totalArticlesCount = 0
      let totalNewQuantity = 0
      let totalUsedQuantity = 0
      let lowStockPositions = 0
      let newValuation = 0
      let usedValuation = 0

      for (const p of state.parts) {
        if (!p) continue
        totalNewQuantity += p.stock_new || 0
        totalUsedQuantity += p.stock_used || 0

        // Deficit: ONLY count if min_stock is specified AND > 0, AND totalStock < min_stock!
        // Parts with empty or 0 min_stock are NOT in deficit (do not need to be in backpack).
        if (Array.isArray(p.articles) && p.articles.length > 0) {
          for (const a of p.articles) {
            const aMin = Number(a.min_stock) || 0
            const aTotal = (Number(a.stock_new) || 0) + (Number(a.stock_used) || 0)
            if (aMin > 0 && aTotal < aMin) {
              lowStockPositions++
            }
          }
        } else {
          const pMin = Number(p.min_stock) || 0
          const pTotal = (Number(p.stock_new) || 0) + (Number(p.stock_used) || 0)
          if (pMin > 0 && pTotal < pMin) {
            lowStockPositions++
          }
        }

        if (Array.isArray(p.articles) && p.articles.length > 0) {
          totalArticlesCount += p.articles.length
          for (const a of p.articles) {
            const pNew = (a.price_new !== undefined && a.price_new > 0) ? a.price_new : (p.price_new || 0)
            const pUsed = (a.price_used !== undefined && a.price_used > 0) ? a.price_used : (p.price_used || 0)
            newValuation += (Number(a.stock_new) || 0) * pNew
            usedValuation += (Number(a.stock_used) || 0) * pUsed
          }
        } else {
          totalArticlesCount += 1
          newValuation += (Number(p.stock_new) || 0) * (p.price_new || 0)
          usedValuation += (Number(p.stock_used) || 0) * (p.price_used || 0)
        }
      }

      return {
        totalPositions: state.parts.length,
        totalArticlesCount,
        totalNewQuantity,
        totalUsedQuantity,
        lowStockPositions,
        totalValuation: Math.round(newValuation + usedValuation),
        newValuation: Math.round(newValuation),
        usedValuation: Math.round(usedValuation)
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
        useNativeWidget().syncWidget()
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

    syncNativeWidget() {
      useNativeWidget().syncWidget()
    },

    async addPart(payload: Omit<Part, 'id' | 'created_at' | 'updated_at'>) {
      this.isLoading = true
      try {
        const newPart = await dbService.createPart(payload)
        this.parts.unshift(newPart)
        this.syncNativeWidget()
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
        this.syncNativeWidget()
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
        this.syncNativeWidget()
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async addArticle(partId: number, articleData: Omit<PartArticle, 'id'>) {
      this.isLoading = true
      try {
        const updatedPart = await dbService.addArticle(partId, articleData)
        const index = this.parts.findIndex(p => p.id === partId)
        if (index !== -1) {
          this.parts[index] = updatedPart
        }
        this.syncNativeWidget()
        return updatedPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateArticle(partId: number, articleId: string, updates: Partial<PartArticle>) {
      this.isLoading = true
      try {
        const updatedPart = await dbService.updateArticle(partId, articleId, updates)
        const index = this.parts.findIndex(p => p.id === partId)
        if (index !== -1) {
          this.parts[index] = updatedPart
        }
        this.syncNativeWidget()
        return updatedPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteArticle(partId: number, articleId: string) {
      this.isLoading = true
      try {
        const updatedPart = await dbService.deleteArticle(partId, articleId)
        const index = this.parts.findIndex(p => p.id === partId)
        if (index !== -1) {
          this.parts[index] = updatedPart
        }
        this.syncNativeWidget()
        return updatedPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateArticleImage(partId: number, articleId: string, image: string) {
      this.isLoading = true
      try {
        const updatedPart = await dbService.updateArticleImage(partId, articleId, image)
        const index = this.parts.findIndex(p => p.id === partId)
        if (index !== -1) {
          this.parts[index] = updatedPart
        }
        return updatedPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updatePartImage(partId: number, image: string) {
      this.isLoading = true
      try {
        const updatedPart = await dbService.updatePartImage(partId, image)
        const index = this.parts.findIndex(p => p.id === partId)
        if (index !== -1) {
          this.parts[index] = updatedPart
        }
        return updatedPart
      } catch (err: any) {
        this.error = err.message
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async recordMovement(params: {
      partId: number
      articleId?: string
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
        this.syncNativeWidget()
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
