import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { Part, Transaction, MovementType, PartCondition } from '~/types'

const DB_NAME = 'neco_parts_db'

class DatabaseService {
  private sqlite: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private isInitialized = false
  private isWeb = false

  // Fallback in-memory/localStorage store for Web Dev environment if jeep-sqlite is unavailable
  private webParts: Part[] = []
  private webTransactions: Transaction[] = []

  async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.isWeb = !Capacitor.isNativePlatform()

      if (this.isWeb) {
        // Initialize jeep-sqlite web component if in browser
        if (typeof window !== 'undefined') {
          await this.initWebStore()
        }
      } else {
        this.sqlite = new SQLiteConnection(CapacitorSQLite)
        const ret = await this.sqlite.checkConnectionsConsistency()
        const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result

        if (ret.result && isConn) {
          this.db = await this.sqlite.retrieveConnection(DB_NAME, false)
        } else {
          this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
        }

        await this.db.open()
        await this.createTablesNative()
      }

      this.isInitialized = true
    } catch (err) {
      console.warn('SQLite native connection init failed, falling back to WebStore:', err)
      this.isWeb = true
      await this.initWebStore()
      this.isInitialized = true
    }
  }

  private async createTablesNative() {
    if (!this.db) return

    const schema = `
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        location TEXT DEFAULT '',
        stock_new INTEGER NOT NULL DEFAULT 0,
        stock_used INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 0,
        price_new REAL DEFAULT 0,
        price_used REAL DEFAULT 0,
        notes TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
      CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(name);

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        condition TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        stock_before INTEGER NOT NULL,
        stock_after INTEGER NOT NULL,
        reason TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_part_id ON transactions(part_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
    `
    await this.db.execute(schema)

    // Seed sample data if empty
    const checkCount = await this.db.query('SELECT COUNT(*) as count FROM parts')
    if (checkCount.values && checkCount.values[0]?.count === 0) {
      await this.seedInitialDataNative()
    }
  }

  private async seedInitialDataNative() {
    if (!this.db) return
    const now = new Date().toISOString()
    const sampleParts = [
      { code: 'ULKA-EX5', name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', category: 'Помпы / Насосы', location: '', stock_new: 6, stock_used: 2, min_stock: 3, price_new: 1850, price_used: 700, notes: 'Универсальная 230V 50Hz (DeLonghi, Saeco, Jura, Nivona)' },
      { code: '5513214821', name: 'Жернова конические (пара) DeLonghi', category: 'Кофемолка', location: '', stock_new: 4, stock_used: 1, min_stock: 2, price_new: 2400, price_used: 900, notes: 'Для кофемолок ECAM, ETAM, ESAM. Закаленная сталь.' },
      { code: 'OR-KIT-DEL', name: 'Ремкомплект уплотнителей заварочного блока (O-Ring)', category: 'Уплотнители', location: '', stock_new: 18, stock_used: 0, min_stock: 6, price_new: 450, price_used: 0, notes: 'Пищевой силикон VMQ / EPDM. Манжеты верхнего и нижнего поршня.' },
      { code: '70163-JUR', name: 'Заварочный блок в сборе Jura Claris / E-серия', category: 'Заварочный блок', location: '', stock_new: 1, stock_used: 3, min_stock: 2, price_new: 9800, price_used: 3800, notes: 'Б/у перебран: новые манжеты, смазан пищевой силиконовой смазкой OKS 1110' },
      { code: '5213218421', name: 'Электромагнитный клапан 3-ходовой Ceme (230V)', category: 'Клапаны', location: '', stock_new: 0, stock_used: 1, min_stock: 2, price_new: 3100, price_used: 1200, notes: 'Клапан пар/вода DeLonghi. Закончились новые, срочно дозаказать!' },
      { code: '5232104600', name: 'Датчик температуры бойлера NTC (термистор)', category: 'Электроника', location: '', stock_new: 7, stock_used: 2, min_stock: 3, price_new: 650, price_used: 250, notes: 'Датчик температуры бойлера с кабелем и разъемом DeLonghi Magnifica' },
      { code: '62999-JUR', name: 'Дренажный клапан Jura в сборе', category: 'Гидравлика', location: '', stock_new: 2, stock_used: 4, min_stock: 3, price_new: 2200, price_used: 800, notes: 'Частая неисправность: сброс кофе/воды в поддон при заваривании' }
    ]

    for (const p of sampleParts) {
      await this.db.run(
        `INSERT INTO parts (code, name, category, location, stock_new, stock_used, min_stock, price_new, price_used, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.code, p.name, p.category, p.location, p.stock_new, p.stock_used, p.min_stock, p.price_new, p.price_used, p.notes, now, now]
      )
    }

    // Seed sample transactions
    await this.db.run(
      `INSERT INTO transactions (part_id, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'IN', 'NEW', 10, 0, 10, 'Поступление партии помп Ulka от ООО "КофеСнаб"', now]
    )
    await this.db.run(
      `INSERT INTO transactions (part_id, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 'OUT', 'NEW', 1, 10, 9, 'Заказ-наряд #412 (DeLonghi Magnifica S - замена помпы)', now]
    )
    await this.db.run(
      `INSERT INTO transactions (part_id, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [4, 'IN', 'USED', 2, 0, 2, 'Поступление с разбора донора Jura Impressa F50', now]
    )
    await this.db.run(
      `INSERT INTO transactions (part_id, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [3, 'OUT', 'NEW', 1, 19, 18, 'Заказ-наряд #415 (DeLonghi Dinamica - ТО и замена колец заварника)', now]
    )
  }

  // Web / Dev Fallback (IndexedDB / LocalStorage)
  private async initWebStore() {
    const savedParts = localStorage.getItem('neco_parts')
    const savedTrans = localStorage.getItem('neco_transactions')

    if (savedParts) {
      try {
        this.webParts = JSON.parse(savedParts)
      } catch {
        this.webParts = []
      }
    }
    if (savedTrans) {
      try {
        this.webTransactions = JSON.parse(savedTrans)
      } catch {
        this.webTransactions = []
      }
    }

    // If empty or if contains old automotive demo parts, reset to coffee machine parts
    const hasOldCarParts = this.webParts.some(p => p.code === '04465-33450' || p.name.includes('Колодки'))
    if (this.webParts.length === 0 || hasOldCarParts) {
      const now = new Date().toISOString()
      this.webParts = [
        { id: 1, code: 'ULKA-EX5', name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', category: 'Помпы / Насосы', location: '', stock_new: 6, stock_used: 2, min_stock: 3, price_new: 1850, price_used: 700, notes: 'Универсальная 230V 50Hz (DeLonghi, Saeco, Jura, Nivona)', created_at: now, updated_at: now },
        { id: 2, code: '5513214821', name: 'Жернова конические (пара) DeLonghi', category: 'Кофемолка', location: '', stock_new: 4, stock_used: 1, min_stock: 2, price_new: 2400, price_used: 900, notes: 'Для кофемолок ECAM, ETAM, ESAM. Закаленная сталь.', created_at: now, updated_at: now },
        { id: 3, code: 'OR-KIT-DEL', name: 'Ремкомплект уплотнителей заварочного блока (O-Ring)', category: 'Уплотнители', location: '', stock_new: 18, stock_used: 0, min_stock: 6, price_new: 450, price_used: 0, notes: 'Пищевой силикон VMQ / EPDM. Манжеты верхнего и нижнего поршня.', created_at: now, updated_at: now },
        { id: 4, code: '70163-JUR', name: 'Заварочный блок в сборе Jura Claris / E-серия', category: 'Заварочный блок', location: '', stock_new: 1, stock_used: 3, min_stock: 2, price_new: 9800, price_used: 3800, notes: 'Б/у перебран: новые манжеты, смазан пищевой силиконовой смазкой OKS 1110', created_at: now, updated_at: now },
        { id: 5, code: '5213218421', name: 'Электромагнитный клапан 3-ходовой Ceme (230V)', category: 'Клапаны', location: '', stock_new: 0, stock_used: 1, min_stock: 2, price_new: 3100, price_used: 1200, notes: 'Клапан пар/вода DeLonghi. Закончились новые, срочно дозаказать!', created_at: now, updated_at: now },
        { id: 6, code: '5232104600', name: 'Датчик температуры бойлера NTC (термистор)', category: 'Электроника', location: '', stock_new: 7, stock_used: 2, min_stock: 3, price_new: 650, price_used: 250, notes: 'Датчик температуры бойлера с кабелем и разъемом DeLonghi Magnifica', created_at: now, updated_at: now },
        { id: 7, code: '62999-JUR', name: 'Дренажный клапан Jura в сборе', category: 'Гидравлика', location: '', stock_new: 2, stock_used: 4, min_stock: 3, price_new: 2200, price_used: 800, notes: 'Частая неисправность: сброс кофе/воды в поддон при заваривании', created_at: now, updated_at: now }
      ]
      this.webTransactions = [
        { id: 1, part_id: 1, part_code: 'ULKA-EX5', part_name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', type: 'IN', condition: 'NEW', quantity: 10, stock_before: 0, stock_after: 10, reason: 'Поступление партии помп Ulka от ООО "КофеСнаб"', created_at: now },
        { id: 2, part_id: 1, part_code: 'ULKA-EX5', part_name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', type: 'OUT', condition: 'NEW', quantity: 1, stock_before: 10, stock_after: 9, reason: 'Заказ-наряд #412 (DeLonghi Magnifica S - замена помпы)', created_at: now },
        { id: 3, part_id: 4, part_code: '70163-JUR', part_name: 'Заварочный блок в сборе Jura Claris / E-серия', type: 'IN', condition: 'USED', quantity: 2, stock_before: 0, stock_after: 2, reason: 'Поступление с разбора донора Jura Impressa F50', created_at: now },
        { id: 4, part_id: 3, part_code: 'OR-KIT-DEL', part_name: 'Ремкомплект уплотнителей заварочного блока (O-Ring)', type: 'OUT', condition: 'NEW', quantity: 1, stock_before: 19, stock_after: 18, reason: 'Заказ-наряд #415 (DeLonghi Dinamica - ТО и замена колец заварника)', created_at: now },
        { id: 5, part_id: 7, part_code: '62999-JUR', part_name: 'Дренажный клапан Jura в сборе', type: 'OUT', condition: 'USED', quantity: 1, stock_before: 5, stock_after: 4, reason: 'Заказ-наряд #418 (Jura E8 - замена дренажного клапана)', created_at: now }
      ]
      this.persistWebStore()
    } else {
      // Clear any leftover warehouse locations from previous demo data
      let cleaned = false
      for (const p of this.webParts) {
        if (p.location) {
          p.location = ''
          cleaned = true
        }
      }
      if (cleaned) {
        this.persistWebStore()
      }
    }
  }

  private persistWebStore() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('neco_parts', JSON.stringify(this.webParts))
      localStorage.setItem('neco_transactions', JSON.stringify(this.webTransactions))
    }
  }

  // --- CRUD PARTS ---
  async getAllParts(): Promise<Part[]> {
    await this.init()
    if (this.isWeb || !this.db) {
      return [...this.webParts].sort((a, b) => a.name.localeCompare(b.name))
    }

    const res = await this.db.query('SELECT * FROM parts ORDER BY name ASC')
    return (res.values as Part[]) || []
  }

  async getPartById(id: number): Promise<Part | null> {
    await this.init()
    if (this.isWeb || !this.db) {
      return this.webParts.find(p => p.id === id) || null
    }

    const res = await this.db.query('SELECT * FROM parts WHERE id = ?', [id])
    return (res.values?.[0] as Part) || null
  }

  async createPart(data: Omit<Part, 'id' | 'created_at' | 'updated_at'>): Promise<Part> {
    await this.init()
    const now = new Date().toISOString()

    if (this.isWeb || !this.db) {
      const nextId = this.webParts.length > 0 ? Math.max(...this.webParts.map(p => p.id)) + 1 : 1
      const newPart: Part = {
        ...data,
        id: nextId,
        created_at: now,
        updated_at: now
      }
      this.webParts.push(newPart)
      this.persistWebStore()
      return newPart
    }

    const res = await this.db.run(
      `INSERT INTO parts (code, name, category, location, stock_new, stock_used, min_stock, price_new, price_used, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.code.trim(),
        data.name.trim(),
        data.category || '',
        data.location || '',
        Number(data.stock_new) || 0,
        Number(data.stock_used) || 0,
        Number(data.min_stock) || 0,
        Number(data.price_new) || 0,
        Number(data.price_used) || 0,
        data.notes || '',
        now,
        now
      ]
    )

    const insertId = res.changes?.lastId || 0
    return (await this.getPartById(insertId))!
  }

  async updatePart(id: number, data: Partial<Omit<Part, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    await this.init()
    const now = new Date().toISOString()

    if (this.isWeb || !this.db) {
      const idx = this.webParts.findIndex(p => p.id === id)
      if (idx !== -1) {
        this.webParts[idx] = { ...this.webParts[idx], ...data, updated_at: now }
        this.persistWebStore()
      }
      return
    }

    const current = await this.getPartById(id)
    if (!current) throw new Error('Запчасть не найдена')

    const merged = { ...current, ...data, updated_at: now }
    await this.db.run(
      `UPDATE parts SET code = ?, name = ?, category = ?, location = ?, stock_new = ?, stock_used = ?, min_stock = ?, price_new = ?, price_used = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        merged.code.trim(),
        merged.name.trim(),
        merged.category,
        merged.location,
        merged.stock_new,
        merged.stock_used,
        merged.min_stock,
        merged.price_new,
        merged.price_used,
        merged.notes,
        now,
        id
      ]
    )
  }

  async deletePart(id: number): Promise<void> {
    await this.init()
    if (this.isWeb || !this.db) {
      this.webParts = this.webParts.filter(p => p.id !== id)
      this.webTransactions = this.webTransactions.filter(t => t.part_id !== id)
      this.persistWebStore()
      return
    }

    await this.db.run('DELETE FROM transactions WHERE part_id = ?', [id])
    await this.db.run('DELETE FROM parts WHERE id = ?', [id])
  }

  // --- STOCK MOVEMENT (+ / -) ---
  async recordMovement(params: {
    partId: number
    type: MovementType
    condition: PartCondition
    quantity: number
    reason: string
  }): Promise<{ part: Part; transaction: Transaction }> {
    await this.init()
    const { partId, type, condition, quantity, reason } = params

    if (quantity <= 0) {
      throw new Error('Количество должно быть больше 0')
    }

    const part = await this.getPartById(partId)
    if (!part) throw new Error('Запчасть не найдена')

    const isNew = condition === 'NEW'
    const currentStock = isNew ? part.stock_new : part.stock_used
    let newStock = currentStock

    if (type === 'IN') {
      newStock = currentStock + quantity
    } else if (type === 'OUT') {
      if (quantity > currentStock) {
        const condLabel = isNew ? 'новых' : 'б/у'
        throw new Error(`Нельзя списать ${quantity} шт. В наличии всего ${currentStock} шт (${condLabel}).`)
      }
      newStock = currentStock - quantity
    } else if (type === 'ADJUST') {
      newStock = quantity
    }

    const now = new Date().toISOString()

    // Update part stock
    if (isNew) {
      part.stock_new = newStock
    } else {
      part.stock_used = newStock
    }
    part.updated_at = now

    if (this.isWeb || !this.db) {
      const transId = this.webTransactions.length > 0 ? Math.max(...this.webTransactions.map(t => t.id)) + 1 : 1
      const transaction: Transaction = {
        id: transId,
        part_id: partId,
        part_code: part.code,
        part_name: part.name,
        type,
        condition,
        quantity,
        stock_before: currentStock,
        stock_after: newStock,
        reason: reason || (type === 'IN' ? 'Приход' : 'Списание'),
        created_at: now
      }

      const pIndex = this.webParts.findIndex(p => p.id === partId)
      if (pIndex !== -1) {
        this.webParts[pIndex] = part
      }
      this.webTransactions.unshift(transaction)
      this.persistWebStore()

      return { part, transaction }
    }

    // Native DB transaction
    const updateCol = isNew ? 'stock_new' : 'stock_used'
    await this.db.run(`UPDATE parts SET ${updateCol} = ?, updated_at = ? WHERE id = ?`, [newStock, now, partId])

    const transRes = await this.db.run(
      `INSERT INTO transactions (part_id, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [partId, type, condition, quantity, currentStock, newStock, reason || (type === 'IN' ? 'Приход' : 'Списание'), now]
    )

    const transaction: Transaction = {
      id: transRes.changes?.lastId || 0,
      part_id: partId,
      part_code: part.code,
      part_name: part.name,
      type,
      condition,
      quantity,
      stock_before: currentStock,
      stock_after: newStock,
      reason,
      created_at: now
    }

    return { part, transaction }
  }

  // --- TRANSACTIONS / HISTORY ---
  async getTransactions(filters?: {
    partId?: number
    type?: MovementType
    dateFrom?: string
    dateTo?: string
  }): Promise<Transaction[]> {
    await this.init()

    if (this.isWeb || !this.db) {
      let list = [...this.webTransactions]
      if (filters?.partId) {
        list = list.filter(t => t.part_id === filters.partId)
      }
      if (filters?.type) {
        list = list.filter(t => t.type === filters.type)
      }
      if (filters?.dateFrom) {
        const fromTs = new Date(filters.dateFrom).getTime()
        list = list.filter(t => new Date(t.created_at).getTime() >= fromTs)
      }
      if (filters?.dateTo) {
        const toTs = new Date(filters.dateTo).setHours(23, 59, 59, 999)
        list = list.filter(t => new Date(t.created_at).getTime() <= toTs)
      }
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    let query = `
      SELECT t.*, p.code as part_code, p.name as part_name
      FROM transactions t
      LEFT JOIN parts p ON t.part_id = p.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters?.partId) {
      query += ' AND t.part_id = ?'
      params.push(filters.partId)
    }
    if (filters?.type) {
      query += ' AND t.type = ?'
      params.push(filters.type)
    }
    if (filters?.dateFrom) {
      query += ' AND date(t.created_at) >= date(?)'
      params.push(filters.dateFrom)
    }
    if (filters?.dateTo) {
      query += ' AND date(t.created_at) <= date(?)'
      params.push(filters.dateTo)
    }

    query += ' ORDER BY t.created_at DESC LIMIT 500'

    const res = await this.db.query(query, params)
    return (res.values as Transaction[]) || []
  }

  // --- IMPORT / EXPORT & BACKUP ---
  async exportAllData(): Promise<{ parts: Part[]; transactions: Transaction[] }> {
    const parts = await this.getAllParts()
    const transactions = await this.getTransactions()
    return { parts, transactions }
  }

  async importData(data: { parts?: Partial<Part>[]; transactions?: Partial<Transaction>[] }): Promise<{ importedParts: number; importedTransactions: number }> {
    await this.init()
    let importedParts = 0
    let importedTransactions = 0

    if (data.parts && Array.isArray(data.parts)) {
      for (const p of data.parts) {
        if (!p.code || !p.name) continue
        await this.createPart({
          code: p.code,
          name: p.name,
          category: p.category || '',
          location: p.location || '',
          stock_new: Number(p.stock_new) || 0,
          stock_used: Number(p.stock_used) || 0,
          min_stock: Number(p.min_stock) || 0,
          price_new: Number(p.price_new) || 0,
          price_used: Number(p.price_used) || 0,
          notes: p.notes || ''
        })
        importedParts++
      }
    }

    return { importedParts, importedTransactions }
  }

  async clearAllData(): Promise<void> {
    await this.init()
    if (this.isWeb || !this.db) {
      this.webParts = []
      this.webTransactions = []
      this.persistWebStore()
      return
    }

    await this.db.run('DELETE FROM transactions')
    await this.db.run('DELETE FROM parts')
  }
}

export const dbService = new DatabaseService()
