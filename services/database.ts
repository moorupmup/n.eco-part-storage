import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { Part, PartArticle, Transaction, MovementType, PartCondition, Category } from '~/types'
import { parseTags, serializeTags } from '~/utils/tags'

export function enrichPart(p: any): Part {
  if (!p) return p

  let articles: PartArticle[] = []
  if (typeof p.articles === 'string') {
    try {
      articles = JSON.parse(p.articles)
    } catch {
      articles = []
    }
  } else if (Array.isArray(p.articles)) {
    articles = [...p.articles]
  }

  if (!Array.isArray(articles) || articles.length === 0) {
    const defaultCode = (p.code || 'АРТИКУЛ').trim()
    articles = [
      {
        id: `art-${p.id || Date.now()}-1`,
        code: defaultCode,
        name: '',
        stock_new: Number(p.stock_new) || 0,
        stock_used: Number(p.stock_used) || 0,
        min_stock: Number(p.min_stock) || 0,
        price_new: Number(p.price_new) || 0,
        price_used: Number(p.price_used) || 0,
        created_at: p.created_at || new Date().toISOString()
      }
    ]
  } else {
    articles = articles.map((a: any, idx: number) => ({
      id: a.id || `art-${p.id || Date.now()}-${idx + 1}`,
      code: (a.code || p.code || 'АРТИКУЛ').trim(),
      name: a.name || '',
      stock_new: Number(a.stock_new) || 0,
      stock_used: Number(a.stock_used) || 0,
      min_stock: Number(a.min_stock) || 0,
      price_new: Number(a.price_new) || 0,
      price_used: Number(a.price_used) || 0,
      created_at: a.created_at || p.created_at || new Date().toISOString()
    }))
  }

  const stock_new = articles.reduce((sum, a) => sum + (Number(a.stock_new) || 0), 0)
  const stock_used = articles.reduce((sum, a) => sum + (Number(a.stock_used) || 0), 0)
  const min_stock = articles.some(a => a.min_stock !== undefined && a.min_stock > 0)
    ? articles.reduce((sum, a) => sum + (Number(a.min_stock) || 0), 0)
    : (Number(p.min_stock) || 0)
  const code = articles[0]?.code || p.code || ''

  return {
    ...p,
    code,
    articles,
    stock_new,
    stock_used,
    min_stock,
    image: p.image || '',
    tags: parseTags(p.tags || p.notes)
  }
}

const DB_NAME = 'neco_parts_db'

export const INITIAL_CATEGORIES = [
  'Помпы / Насосы',
  'Заварочный блок',
  'Кофемолка',
  'Уплотнители',
  'Клапаны',
  'Бойлеры / ТЭНы',
  'Электроника',
  'Гидравлика'
]

export const SAMPLE_PARTS_DATA = [
  {
    id: 1,
    code: 'ULKA-EX5',
    name: 'Помпа вибрационная Ulka EX5 (48W, 230V)',
    category: 'Помпы / Насосы',
    location: '',
    stock_new: 6,
    stock_used: 3,
    min_stock: 11,
    price_new: 1850,
    price_used: 700,
    notes: serializeTags(['230V', '48W', 'Ulka', 'DeLonghi', 'Saeco', 'Jura', 'Nivona', 'Универсальная']),
    tags: ['230V', '48W', 'Ulka', 'DeLonghi', 'Saeco', 'Jura', 'Nivona', 'Универсальная'],
    articles: [
      { id: 'art-1-1', code: '5513214821', name: 'Оригинал DeLonghi', stock_new: 1, stock_used: 0, min_stock: 3, price_new: 1850, price_used: 700 },
      { id: 'art-1-2', code: 'EX5-230V', name: 'Универсальная Ulka', stock_new: 4, stock_used: 2, min_stock: 2, price_new: 1650, price_used: 600 },
      { id: 'art-1-3', code: '996530007754', name: 'Saeco / Philips аналог', stock_new: 0, stock_used: 0, min_stock: 2, price_new: 1900, price_used: 750 },
      { id: 'art-1-4', code: 'EP5-PLASTIC', name: 'Ulka EP5 пластик. шток', stock_new: 1, stock_used: 1, min_stock: 4, price_new: 1550, price_used: 500 }
    ]
  },
  {
    id: 2,
    code: '5513214821',
    name: 'Жернова конические (пара) DeLonghi',
    category: 'Кофемолка',
    location: '',
    stock_new: 1,
    stock_used: 1,
    min_stock: 6,
    price_new: 2400,
    price_used: 900,
    notes: serializeTags(['DeLonghi', 'ECAM', 'ETAM', 'ESAM', 'Закаленная сталь']),
    tags: ['DeLonghi', 'ECAM', 'ETAM', 'ESAM', 'Закаленная сталь'],
    articles: [
      { id: 'art-2-1', code: '5513214821', name: 'Оригинал сталь', stock_new: 1, stock_used: 0, min_stock: 3, price_new: 2400, price_used: 900 },
      { id: 'art-2-2', code: 'DL-GRIND-TITAN', name: 'Титан износостойкий', stock_new: 0, stock_used: 1, min_stock: 2, price_new: 3200, price_used: 1400 },
      { id: 'art-2-3', code: '7313217421', name: 'Внешний конус ECAM', stock_new: 0, stock_used: 0, min_stock: 1, price_new: 1200, price_used: 400 }
    ]
  },
  {
    id: 3,
    code: 'OR-KIT-DEL',
    name: 'Ремкомплект уплотнителей заварочного блока (O-Ring)',
    category: 'Уплотнители',
    location: '',
    stock_new: 21,
    stock_used: 0,
    min_stock: 19,
    price_new: 450,
    price_used: 0,
    notes: serializeTags(['DeLonghi', 'O-Ring', 'Силикон', 'VMQ', 'EPDM']),
    tags: ['DeLonghi', 'O-Ring', 'Силикон', 'VMQ', 'EPDM'],
    articles: [
      { id: 'art-3-1', code: 'OR-KIT-DEL', name: 'DeLonghi красный силикон (комплект)', stock_new: 18, stock_used: 0, min_stock: 6, price_new: 450, price_used: 0 },
      { id: 'art-3-2', code: 'OR-JURA-BLUE', name: 'Jura EPDM синий (пара колец)', stock_new: 2, stock_used: 0, min_stock: 8, price_new: 550, price_used: 0 },
      { id: 'art-3-3', code: 'OR-SAECO-NM', name: 'Saeco желтый 32x4мм', stock_new: 1, stock_used: 0, min_stock: 5, price_new: 380, price_used: 0 }
    ]
  },
  {
    id: 4,
    code: '70163-JUR',
    name: 'Заварочный блок в сборе Jura Claris / E-серия',
    category: 'Заварочный блок',
    location: '',
    stock_new: 1,
    stock_used: 4,
    min_stock: 4,
    price_new: 9800,
    price_used: 3800,
    notes: serializeTags(['Jura', 'Claris', 'E-серия', 'OKS 1110']),
    tags: ['Jura', 'Claris', 'E-серия', 'OKS 1110'],
    articles: [
      { id: 'art-4-1', code: '70163-JUR', name: 'Jura Claris E-серия оригинал', stock_new: 1, stock_used: 3, min_stock: 2, price_new: 9800, price_used: 3800 },
      { id: 'art-4-2', code: '70163-J6', name: 'Jura J-серия в сборе', stock_new: 0, stock_used: 1, min_stock: 2, price_new: 11500, price_used: 4200 }
    ]
  },
  {
    id: 5,
    code: '5213218421',
    name: 'Электромагнитный клапан 3-ходовой Ceme (230V)',
    category: 'Клапаны',
    location: '',
    stock_new: 1,
    stock_used: 1,
    min_stock: 6,
    price_new: 3100,
    price_used: 1200,
    notes: serializeTags(['DeLonghi', 'Ceme', '230V', 'Пар/вода']),
    tags: ['DeLonghi', 'Ceme', '230V', 'Пар/вода'],
    articles: [
      { id: 'art-5-1', code: '5213218421', name: 'Ceme 230V 50Hz прямой', stock_new: 0, stock_used: 1, min_stock: 2, price_new: 3100, price_used: 1200 },
      { id: 'art-5-2', code: '5213214100', name: 'Угловой 13.5VA', stock_new: 0, stock_used: 0, min_stock: 2, price_new: 3400, price_used: 1300 },
      { id: 'art-5-3', code: 'CEME-688', name: 'Клапан сброса пара', stock_new: 1, stock_used: 0, min_stock: 2, price_new: 2900, price_used: 1100 }
    ]
  },
  {
    id: 6,
    code: '5232104600',
    name: 'Датчик температуры бойлера NTC (термистор)',
    category: 'Электроника',
    location: '',
    stock_new: 8,
    stock_used: 2,
    min_stock: 7,
    price_new: 650,
    price_used: 250,
    notes: serializeTags(['DeLonghi', 'Magnifica', 'NTC', 'Термистор']),
    tags: ['DeLonghi', 'Magnifica', 'NTC', 'Термистор'],
    articles: [
      { id: 'art-6-1', code: '5232104600', name: 'Клемма 2 pin плоская', stock_new: 7, stock_used: 2, min_stock: 3, price_new: 650, price_used: 250 },
      { id: 'art-6-2', code: '5217100200', name: 'Винтовой термодатчик M4', stock_new: 1, stock_used: 0, min_stock: 4, price_new: 850, price_used: 300 }
    ]
  },
  {
    id: 7,
    code: '62999-JUR',
    name: 'Дренажный клапан Jura в сборе',
    category: 'Гидравлика',
    location: '',
    stock_new: 3,
    stock_used: 4,
    min_stock: 10,
    price_new: 2200,
    price_used: 800,
    notes: serializeTags(['Jura', 'Дренаж', 'Клапан']),
    tags: ['Jura', 'Дренаж', 'Клапан'],
    articles: [
      { id: 'art-7-1', code: '62999-JUR', name: 'Оригинал V2', stock_new: 2, stock_used: 4, min_stock: 3, price_new: 2200, price_used: 800 },
      { id: 'art-7-2', code: '62999-MOD', name: 'Усиленный алюминиевый шток', stock_new: 1, stock_used: 0, min_stock: 3, price_new: 2600, price_used: 950 },
      { id: 'art-7-3', code: '62999-SEAL', name: 'Манжета дренажника (губка)', stock_new: 0, stock_used: 0, min_stock: 4, price_new: 420, price_used: 0 }
    ]
  }
]

class DatabaseService {
  private sqlite: SQLiteConnection | null = null
  private db: SQLiteDBConnection | null = null
  private isInitialized = false
  private isWeb = false

  // Fallback in-memory/localStorage store for Web Dev environment if jeep-sqlite is unavailable
  private webParts: Part[] = []
  private webTransactions: Transaction[] = []
  private webCategories: Category[] = []

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
        image TEXT DEFAULT '',
        articles TEXT DEFAULT '[]',
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

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_id INTEGER NOT NULL,
        article_id TEXT DEFAULT '',
        article_code TEXT DEFAULT '',
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

    // Run safe migrations for existing tables
    try { await this.db.execute(`ALTER TABLE parts ADD COLUMN image TEXT DEFAULT ''`) } catch {}
    try { await this.db.execute(`ALTER TABLE parts ADD COLUMN articles TEXT DEFAULT '[]'`) } catch {}
    try { await this.db.execute(`ALTER TABLE transactions ADD COLUMN article_id TEXT DEFAULT ''`) } catch {}
    try { await this.db.execute(`ALTER TABLE transactions ADD COLUMN article_code TEXT DEFAULT ''`) } catch {}

    // Seed categories if empty
    const checkCatCount = await this.db.query('SELECT COUNT(*) as count FROM categories')
    if (checkCatCount.values && checkCatCount.values[0]?.count === 0) {
      const now = new Date().toISOString()
      for (const cat of INITIAL_CATEGORIES) {
        await this.db.run(`INSERT OR IGNORE INTO categories (name, created_at) VALUES (?, ?)`, [cat, now])
      }
    }

    // Seed sample data if empty
    const checkCount = await this.db.query('SELECT COUNT(*) as count FROM parts')
    if (checkCount.values && checkCount.values[0]?.count === 0) {
      await this.seedInitialDataNative()
    } else {
      // Check if native SQLite needs migration to V2 rich articles with low stock positions
      try {
        const checkSeed = await this.db.query("SELECT COUNT(*) as count FROM parts WHERE articles LIKE '%art-1-4%'")
        if (checkSeed.values && checkSeed.values[0]?.count === 0) {
          for (const sample of SAMPLE_PARTS_DATA) {
            const articlesJson = JSON.stringify(sample.articles)
            await this.db.run(
              `UPDATE parts SET articles = ?, stock_new = ?, stock_used = ?, min_stock = ? WHERE code = ?`,
              [articlesJson, sample.stock_new, sample.stock_used, sample.min_stock, sample.code]
            )
          }
        }
      } catch {}
    }
  }

  private async seedInitialDataNative() {
    if (!this.db) return
    const now = new Date().toISOString()

    for (const p of SAMPLE_PARTS_DATA) {
      const articlesJson = JSON.stringify(p.articles)
      await this.db.run(
        `INSERT INTO parts (code, name, category, location, stock_new, stock_used, min_stock, price_new, price_used, notes, articles, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.code, p.name, p.category, p.location || '', p.stock_new, p.stock_used, p.min_stock, p.price_new, p.price_used, p.notes, articlesJson, now, now]
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
    const savedCategories = localStorage.getItem('neco_categories')

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
    if (savedCategories) {
      try {
        this.webCategories = JSON.parse(savedCategories)
      } catch {
        this.webCategories = []
      }
    }

    if (this.webCategories.length === 0) {
      const now = new Date().toISOString()
      this.webCategories = INITIAL_CATEGORIES.map((name, idx) => ({
        id: idx + 1,
        name,
        created_at: now
      }))
    }

    // If empty or if contains old automotive demo parts, reset to coffee machine parts
    const hasOldCarParts = this.webParts.some(p => p && (p.code === '04465-33450' || (p.name && p.name.includes('Колодки'))))
    if (this.webParts.length === 0 || hasOldCarParts) {
      const now = new Date().toISOString()
      this.webParts = SAMPLE_PARTS_DATA.map(p => ({
        ...p,
        created_at: now,
        updated_at: now
      }))
      this.webTransactions = [
        { id: 1, part_id: 1, part_code: 'ULKA-EX5', part_name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', type: 'IN', condition: 'NEW', quantity: 10, stock_before: 0, stock_after: 10, reason: 'Поступление партии помп Ulka от ООО "КофеСнаб"', created_at: now },
        { id: 2, part_id: 1, part_code: 'ULKA-EX5', part_name: 'Помпа вибрационная Ulka EX5 (48W, 230V)', type: 'OUT', condition: 'NEW', quantity: 1, stock_before: 10, stock_after: 9, reason: 'Заказ-наряд #412 (DeLonghi Magnifica S - замена помпы)', created_at: now },
        { id: 3, part_id: 4, part_code: '70163-JUR', part_name: 'Заварочный блок в сборе Jura Claris / E-серия', type: 'IN', condition: 'USED', quantity: 2, stock_before: 0, stock_after: 2, reason: 'Поступление с разбора донора Jura Impressa F50', created_at: now },
        { id: 4, part_id: 3, part_code: 'OR-KIT-DEL', part_name: 'Ремкомплект уплотнителей заварочного блока (O-Ring)', type: 'OUT', condition: 'NEW', quantity: 1, stock_before: 19, stock_after: 18, reason: 'Заказ-наряд #415 (DeLonghi Dinamica - ТО и замена колец заварника)', created_at: now },
        { id: 5, part_id: 7, part_code: '62999-JUR', part_name: 'Дренажный клапан Jura в сборе', type: 'OUT', condition: 'USED', quantity: 1, stock_before: 5, stock_after: 4, reason: 'Заказ-наряд #418 (Jura E8 - замена дренажного клапана)', created_at: now }
      ]
      this.persistWebStore()
    } else {
      // Upgrade existing web store demo parts to rich articles with low-stock test positions
      const lowStockSeedApplied = typeof localStorage !== 'undefined' ? localStorage.getItem('neco_sample_v2_low_stock') : null
      if (!lowStockSeedApplied) {
        const sampleMap = new Map(SAMPLE_PARTS_DATA.map(s => [s.code, s]))
        for (const p of this.webParts) {
          const sampleMatch = sampleMap.get(p.code)
          if (sampleMatch) {
            p.articles = [...sampleMatch.articles]
            p.stock_new = sampleMatch.stock_new
            p.stock_used = sampleMatch.stock_used
            p.min_stock = sampleMatch.min_stock
          }
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('neco_sample_v2_low_stock', '1')
        }
        this.persistWebStore()
      }

      // Clear any leftover warehouse locations from previous demo data
      let cleaned = false
      for (const p of this.webParts) {
        if (p && p.location) {
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
      localStorage.setItem('neco_categories', JSON.stringify(this.webCategories))
    }
  }

  // --- CRUD PARTS ---
  async getAllParts(): Promise<Part[]> {
    await this.init()
    if (this.isWeb || !this.db) {
      return [...this.webParts].map(enrichPart).sort((a, b) => a.name.localeCompare(b.name))
    }

    const res = await this.db.query('SELECT * FROM parts ORDER BY name ASC')
    return ((res.values as Part[]) || []).map(enrichPart)
  }

  async getPartById(id: number): Promise<Part | null> {
    await this.init()
    if (this.isWeb || !this.db) {
      const p = this.webParts.find(p => p.id === id) || null
      return p ? enrichPart(p) : null
    }

    const res = await this.db.query('SELECT * FROM parts WHERE id = ?', [id])
    const p = (res.values?.[0] as Part) || null
    return p ? enrichPart(p) : null
  }

  async createPart(data: Omit<Part, 'id' | 'created_at' | 'updated_at'>): Promise<Part> {
    await this.init()
    const now = new Date().toISOString()
    const notesValue = data.tags !== undefined ? serializeTags(data.tags) : (data.notes || '')
    const articles = data.articles && data.articles.length > 0
      ? data.articles.map((a, idx) => ({
          ...a,
          id: a.id || `art-${Date.now()}-${idx + 1}`,
          stock_new: Number(a.stock_new) || 0,
          stock_used: Number(a.stock_used) || 0,
          min_stock: Number(a.min_stock) || 0,
          price_new: Number(a.price_new) || 0,
          price_used: Number(a.price_used) || 0,
          created_at: a.created_at || now
        }))
      : (data.code?.trim() ? [{
          id: `art-${Date.now()}-1`,
          code: data.code.trim(),
          name: '',
          stock_new: Number(data.stock_new) || 0,
          stock_used: Number(data.stock_used) || 0,
          min_stock: Number(data.min_stock) || 0,
          price_new: Number(data.price_new) || 0,
          price_used: Number(data.price_used) || 0,
          created_at: now
        }] : [])
    const stock_new = articles.reduce((sum, a) => sum + (Number(a.stock_new) || 0), 0)
    const stock_used = articles.reduce((sum, a) => sum + (Number(a.stock_used) || 0), 0)
    const primaryCode = articles[0]?.code || data.code || ''
    const image = data.image || ''

    if (this.isWeb || !this.db) {
      const nextId = this.webParts.length > 0 ? Math.max(...this.webParts.map(p => p.id)) + 1 : 1
      const newPart: Part = enrichPart({
        ...data,
        id: nextId,
        code: primaryCode,
        image,
        articles,
        stock_new,
        stock_used,
        notes: notesValue,
        created_at: now,
        updated_at: now
      })
      this.webParts.push(newPart)
      this.persistWebStore()
      return newPart
    }

    const res = await this.db.run(
      `INSERT INTO parts (code, name, category, location, image, articles, stock_new, stock_used, min_stock, price_new, price_used, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        primaryCode.trim(),
        data.name.trim(),
        data.category || '',
        data.location || '',
        image,
        JSON.stringify(articles),
        stock_new,
        stock_used,
        Number(data.min_stock) || 0,
        Number(data.price_new) || 0,
        Number(data.price_used) || 0,
        notesValue,
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

    const current = await this.getPartById(id)
    if (!current) throw new Error('Запчасть не найдена')

    const mergedArticles = data.articles ? [...data.articles] : [...current.articles]
    const stock_new = mergedArticles.reduce((sum, a) => sum + (Number(a.stock_new) || 0), 0)
    const stock_used = mergedArticles.reduce((sum, a) => sum + (Number(a.stock_used) || 0), 0)
    const primaryCode = mergedArticles[0]?.code || data.code || current.code || ''
    const notesValue = data.tags !== undefined ? serializeTags(data.tags) : (data.notes !== undefined ? data.notes : current.notes)
    const image = data.image !== undefined ? data.image : (current.image || '')

    if (this.isWeb || !this.db) {
      const idx = this.webParts.findIndex(p => p.id === id)
      if (idx !== -1) {
        this.webParts[idx] = enrichPart({
          ...this.webParts[idx],
          ...data,
          code: primaryCode,
          image,
          articles: mergedArticles,
          stock_new,
          stock_used,
          notes: notesValue,
          updated_at: now
        })
        this.persistWebStore()
      }
      return
    }

    const merged = enrichPart({
      ...current,
      ...data,
      code: primaryCode,
      image,
      articles: mergedArticles,
      stock_new,
      stock_used,
      notes: notesValue,
      updated_at: now
    })

    await this.db.run(
      `UPDATE parts SET code = ?, name = ?, category = ?, location = ?, image = ?, articles = ?, stock_new = ?, stock_used = ?, min_stock = ?, price_new = ?, price_used = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        merged.code.trim(),
        merged.name.trim(),
        merged.category,
        merged.location,
        merged.image || '',
        JSON.stringify(merged.articles),
        merged.stock_new,
        merged.stock_used,
        merged.min_stock,
        merged.price_new,
        merged.price_used,
        notesValue,
        now,
        id
      ]
    )
  }

  async addArticle(partId: number, articleData: Omit<PartArticle, 'id'>): Promise<Part> {
    const part = await this.getPartById(partId)
    if (!part) throw new Error('Запчасть не найдена')

    const newArticle: PartArticle = {
      ...articleData,
      id: `art-${partId}-${Date.now()}`,
      code: articleData.code.trim(),
      name: (articleData.name || '').trim(),
      stock_new: Number(articleData.stock_new) || 0,
      stock_used: Number(articleData.stock_used) || 0,
      min_stock: Number(articleData.min_stock) || 0,
      price_new: Number(articleData.price_new) || 0,
      price_used: Number(articleData.price_used) || 0,
      created_at: new Date().toISOString()
    }

    const articles = [...(part.articles || []), newArticle]
    await this.updatePart(partId, { articles })
    return (await this.getPartById(partId))!
  }

  async updateArticle(partId: number, articleId: string, updates: Partial<PartArticle>): Promise<Part> {
    const part = await this.getPartById(partId)
    if (!part) throw new Error('Запчасть не найдена')

    const articles = (part.articles || []).map(a => {
      if (a.id === articleId) {
        return {
          ...a,
          ...updates,
          code: updates.code !== undefined ? updates.code.trim() : a.code,
          name: updates.name !== undefined ? updates.name.trim() : a.name,
          stock_new: updates.stock_new !== undefined ? Number(updates.stock_new) : a.stock_new,
          stock_used: updates.stock_used !== undefined ? Number(updates.stock_used) : a.stock_used,
          min_stock: updates.min_stock !== undefined ? Number(updates.min_stock) : (a.min_stock || 0)
        }
      }
      return a
    })

    await this.updatePart(partId, { articles })
    return (await this.getPartById(partId))!
  }

  async deleteArticle(partId: number, articleId: string): Promise<Part> {
    const part = await this.getPartById(partId)
    if (!part) throw new Error('Запчасть не найдена')

    if (part.articles.length <= 1) {
      throw new Error('У детали должен оставаться хотя бы один артикул')
    }

    const articles = part.articles.filter(a => a.id !== articleId)
    await this.updatePart(partId, { articles })
    return (await this.getPartById(partId))!
  }

  async updatePartImage(partId: number, image: string): Promise<Part> {
    await this.updatePart(partId, { image })
    return (await this.getPartById(partId))!
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
    articleId?: string
    type: MovementType
    condition: PartCondition
    quantity: number
    reason: string
  }): Promise<{ part: Part; transaction: Transaction }> {
    await this.init()
    const { partId, articleId, type, condition, quantity, reason } = params

    if (quantity <= 0) {
      throw new Error('Количество должно быть больше 0')
    }

    const part = await this.getPartById(partId)
    if (!part) throw new Error('Запчасть не найдена')

    // Find specific article or fallback to first
    let article = part.articles.find(a => a.id === articleId)
    if (!article && part.articles.length > 0) {
      article = part.articles[0]
    }
    if (!article) {
      article = {
        id: `art-${partId}-1`,
        code: part.code || 'АРТИКУЛ',
        stock_new: part.stock_new || 0,
        stock_used: part.stock_used || 0
      }
      part.articles.push(article)
    }

    const isNew = condition === 'NEW'
    const currentStock = isNew ? article.stock_new : article.stock_used
    let newStock = currentStock

    if (type === 'IN') {
      newStock = currentStock + quantity
    } else if (type === 'OUT') {
      if (quantity > currentStock) {
        const condLabel = isNew ? 'новых' : 'б/у'
        throw new Error(`Нельзя списать ${quantity} шт по артикулу ${article.code}. В наличии всего ${currentStock} шт (${condLabel}).`)
      }
      newStock = currentStock - quantity
    } else if (type === 'ADJUST') {
      newStock = quantity
    }

    // Update article stock
    if (isNew) {
      article.stock_new = newStock
    } else {
      article.stock_used = newStock
    }

    // Recalculate part totals
    part.stock_new = part.articles.reduce((sum, a) => sum + (Number(a.stock_new) || 0), 0)
    part.stock_used = part.articles.reduce((sum, a) => sum + (Number(a.stock_used) || 0), 0)
    const now = new Date().toISOString()
    part.updated_at = now

    // Persist part
    await this.updatePart(partId, {
      articles: part.articles,
      stock_new: part.stock_new,
      stock_used: part.stock_used
    })

    const updatedPart = (await this.getPartById(partId))!

    if (this.isWeb || !this.db) {
      const transId = this.webTransactions.length > 0 ? Math.max(...this.webTransactions.map(t => t.id)) + 1 : 1
      const transaction: Transaction = {
        id: transId,
        part_id: partId,
        article_id: article.id,
        article_code: article.code,
        part_code: article.code,
        part_name: part.name,
        type,
        condition,
        quantity,
        stock_before: currentStock,
        stock_after: newStock,
        reason: reason || (type === 'IN' ? 'Приход' : 'Списание'),
        created_at: now
      }

      this.webTransactions.unshift(transaction)
      this.persistWebStore()

      return { part: updatedPart, transaction }
    }

    const transRes = await this.db.run(
      `INSERT INTO transactions (part_id, article_id, article_code, type, condition, quantity, stock_before, stock_after, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [partId, article.id, article.code, type, condition, quantity, currentStock, newStock, reason || (type === 'IN' ? 'Приход' : 'Списание'), now]
    )

    const transaction: Transaction = {
      id: transRes.changes?.lastId || 0,
      part_id: partId,
      article_id: article.id,
      article_code: article.code,
      part_code: article.code,
      part_name: part.name,
      type,
      condition,
      quantity,
      stock_before: currentStock,
      stock_after: newStock,
      reason,
      created_at: now
    }

    return { part: updatedPart, transaction }
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

  // --- CATEGORIES ---
  async getAllCategories(): Promise<Category[]> {
    await this.init()
    if (this.isWeb || !this.db) {
      // Ensure any categories used in webParts exist in webCategories
      const existingNames = new Set(this.webCategories.map(c => c.name.toLowerCase().trim()))
      let nextId = (this.webCategories.length > 0 ? Math.max(...this.webCategories.map(c => c.id)) : 0) + 1
      let added = false
      for (const p of this.webParts) {
        if (p.category && p.category.trim() && !existingNames.has(p.category.toLowerCase().trim())) {
          this.webCategories.push({
            id: nextId++,
            name: p.category.trim(),
            created_at: new Date().toISOString()
          })
          existingNames.add(p.category.toLowerCase().trim())
          added = true
        }
      }
      if (added) this.persistWebStore()
      return [...this.webCategories].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    }

    // SQLite Native: sync categories used in parts
    await this.db.execute(`
      INSERT OR IGNORE INTO categories (name)
      SELECT DISTINCT category FROM parts WHERE category IS NOT NULL AND category != ''
    `)
    const res = await this.db.query('SELECT * FROM categories ORDER BY name ASC')
    return (res.values as Category[]) || []
  }

  async createCategory(name: string): Promise<Category> {
    await this.init()
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Название категории не может быть пустым')

    const now = new Date().toISOString()
    if (this.isWeb || !this.db) {
      const exists = this.webCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())
      if (exists) throw new Error('Категория с таким названием уже существует')
      const newCat: Category = {
        id: (this.webCategories.length > 0 ? Math.max(...this.webCategories.map(c => c.id)) : 0) + 1,
        name: trimmed,
        created_at: now
      }
      this.webCategories.push(newCat)
      this.persistWebStore()
      return newCat
    }

    try {
      const res = await this.db.run(
        `INSERT INTO categories (name, created_at) VALUES (?, ?)`,
        [trimmed, now]
      )
      return {
        id: res.changes?.lastId || Date.now(),
        name: trimmed,
        created_at: now
      }
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE')) {
        throw new Error('Категория с таким названием уже существует')
      }
      throw err
    }
  }

  async renameCategory(oldName: string, newName: string): Promise<void> {
    await this.init()
    const trimmedOld = oldName.trim()
    const trimmedNew = newName.trim()
    if (!trimmedNew) throw new Error('Новое название не может быть пустым')
    if (trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return

    if (this.isWeb || !this.db) {
      const exists = this.webCategories.some(c => c.name.toLowerCase() === trimmedNew.toLowerCase())
      if (exists) throw new Error('Категория с таким названием уже существует')

      const cat = this.webCategories.find(c => c.name.toLowerCase() === trimmedOld.toLowerCase())
      if (cat) {
        cat.name = trimmedNew
      }
      for (const p of this.webParts) {
        if (p.category && p.category.toLowerCase().trim() === trimmedOld.toLowerCase()) {
          p.category = trimmedNew
        }
      }
      this.persistWebStore()
      return
    }

    await this.db.run(`UPDATE categories SET name = ? WHERE name = ?`, [trimmedNew, trimmedOld])
    await this.db.run(`UPDATE parts SET category = ? WHERE category = ?`, [trimmedNew, trimmedOld])
  }

  async deleteCategory(name: string): Promise<void> {
    await this.init()
    const trimmed = name.trim()

    if (this.isWeb || !this.db) {
      this.webCategories = this.webCategories.filter(c => c.name.toLowerCase() !== trimmed.toLowerCase())
      for (const p of this.webParts) {
        if (p.category && p.category.toLowerCase().trim() === trimmed.toLowerCase()) {
          p.category = ''
        }
      }
      this.persistWebStore()
      return
    }

    await this.db.run(`DELETE FROM categories WHERE name = ?`, [trimmed])
    await this.db.run(`UPDATE parts SET category = '' WHERE category = ?`, [trimmed])
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
      this.webCategories = INITIAL_CATEGORIES.map((name, idx) => ({
        id: idx + 1,
        name,
        created_at: new Date().toISOString()
      }))
      this.persistWebStore()
      return
    }

    await this.db.run('DELETE FROM transactions')
    await this.db.run('DELETE FROM parts')
    await this.db.run('DELETE FROM categories')
    const now = new Date().toISOString()
    for (const cat of INITIAL_CATEGORIES) {
      await this.db.run(`INSERT OR IGNORE INTO categories (name, created_at) VALUES (?, ?)`, [cat, now])
    }
  }
}

export const dbService = new DatabaseService()
