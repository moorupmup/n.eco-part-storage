export interface PartArticle {
  id: string              // Уникальный ID артикула (например, "art-1727500000000")
  code: string            // Каталожный номер / артикул (например, ULKA-EX5, 5513214821)
  name?: string           // Примечание / производитель (например, "Оригинал DeLonghi")
  stock_new: number       // В наличии новых (шт)
  stock_used: number      // В наличии б/у (шт)
  min_stock?: number      // Минимальный остаток с собой (новые + б/у)
  price_new?: number      // Цена новой детали (руб)
  price_used?: number     // Цена б/у детали (руб)
  created_at?: string
}

export interface Part {
  id: number
  code?: string           // Каталожный номер / основной артикул (для обратной совместимости)
  name: string           // Название детали (например, Помпа вибрационная Ulka EX5)
  category: string       // Категория / узел (Помпы, Заварочный блок, Клапаны...)
  location?: string      // Опционально для обратной совместимости
  image?: string         // URL или base64 Data URL фотографии детали
  articles: PartArticle[] // Список артикулов этой детали
  stock_new: number      // Суммарно новых (шт)
  stock_used: number     // Суммарно б/у (шт)
  min_stock: number      // Минимальный остаток в рюкзаке
  price_new: number      // Цена новой детали (руб)
  price_used: number     // Цена б/у детали (руб)
  notes: string          // Примечания / сохраненные теги
  tags?: string[]        // Список тегов совместимости (DeLonghi, Jura, 230V...)
  created_at: string
  updated_at: string
}

export type MovementType = 'IN' | 'OUT' | 'ADJUST'
export type PartCondition = 'NEW' | 'USED'

export interface Transaction {
  id: number
  part_id: number
  article_id?: string
  article_code?: string
  part_code?: string
  part_name?: string
  type: MovementType      // IN (+ приход), OUT (- списание/выдача), ADJUST (корректировка)
  condition: PartCondition // NEW (новая), USED (б/у)
  quantity: number
  stock_before: number
  stock_after: number
  reason: string         // Причина (заказ-наряд, приходная накладная, дефект...)
  created_at: string
}

export interface InventoryStats {
  totalPositions: number
  totalNewQuantity: number
  totalUsedQuantity: number
  lowStockPositions: number
}

export interface Category {
  id: number
  name: string
  created_at?: string
}

export interface CategoryWithStats extends Category {
  partsCount: number
  totalNew: number
  totalUsed: number
}
