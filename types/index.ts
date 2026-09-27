export interface Part {
  id: number
  code: string           // Каталожный номер / артикул (например, 2108-1003020)
  name: string           // Название (например, Прокладка ГБЦ)
  category: string       // Категория / узел (Двигатель, Тормозная система, Подвеска...)
  location: string       // Ячейка / полка (Стеллаж А-3, Полка 2)
  stock_new: number      // Остаток новых запчастей
  stock_used: number     // Остаток б/у запчастей
  min_stock: number      // Минимальный остаток (порог для заявки на выдачу/закупку)
  price_new: number      // Цена новой запчасти (руб)
  price_used: number     // Цена б/у запчасти (руб)
  notes: string          // Примечания, совместимость
  created_at: string
  updated_at: string
}

export type MovementType = 'IN' | 'OUT' | 'ADJUST'
export type PartCondition = 'NEW' | 'USED'

export interface Transaction {
  id: number
  part_id: number
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
