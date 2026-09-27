import * as XLSX from 'xlsx'
import type { Part, Transaction } from '~/types'

export function exportPartsToExcel(parts: Part[], filename = 'neco_parts_backpack.xlsx') {
  const data = parts.map(p => ({
    'ID': p.id,
    'Артикул / Код': p.code,
    'Наименование': p.name,
    'Категория': p.category,
    'Новые (шт)': p.stock_new,
    'Б/У (шт)': p.stock_used,
    'Всего (шт)': p.stock_new + p.stock_used,
    'Цена новая (руб)': p.price_new,
    'Цена б/у (руб)': p.price_used,
    'Примечание': p.notes,
    'Обновлено': p.updated_at
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Запчасти')
  XLSX.writeFile(workbook, filename)
}

export function exportTransactionsToExcel(transactions: Transaction[], filename = 'istoriya_dvizheniy.xlsx') {
  const typeMap: Record<string, string> = {
    'IN': 'Приход (+)',
    'OUT': 'Списание/Выдача (-)',
    'ADJUST': 'Корректировка'
  }

  const data = transactions.map(t => ({
    'ID': t.id,
    'Дата': new Date(t.created_at).toLocaleString('ru-RU'),
    'Артикул': t.part_code || '',
    'Деталь': t.part_name || '',
    'Тип операции': typeMap[t.type] || t.type,
    'Состояние': t.condition === 'NEW' ? 'Новая' : 'Б/У',
    'Количество': t.quantity,
    'Было': t.stock_before,
    'Стало': t.stock_after,
    'Причина / Наряд': t.reason
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'История')
  XLSX.writeFile(workbook, filename)
}

export function exportFullBackupJSON(parts: Part[], transactions: Transaction[]) {
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    parts,
    transactions
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup_neco_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function parseExcelOrCSV(file: File): Promise<Partial<Part>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[firstSheetName]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet)

        const parts: Partial<Part>[] = rows.map(r => {
          return {
            code: String(r['Артикул / Код'] || r['Артикул'] || r['code'] || r['Код'] || '').trim(),
            name: String(r['Наименование'] || r['Название'] || r['name'] || '').trim(),
            category: String(r['Категория'] || r['category'] || '').trim(),
            location: String(r['Ячейка / Место'] || r['Ячейка'] || r['location'] || '').trim(),
            stock_new: Number(r['Новые (шт)'] || r['Новые'] || r['stock_new'] || 0),
            stock_used: Number(r['Б/У (шт)'] || r['Б/У'] || r['stock_used'] || 0),
            min_stock: Number(r['Мин. остаток (шт)'] || r['Мин. остаток'] || r['min_stock'] || 0),
            price_new: Number(r['Цена новая (руб)'] || r['price_new'] || 0),
            price_used: Number(r['Цена б/у (руб)'] || r['price_used'] || 0),
            notes: String(r['Примечание'] || r['notes'] || '')
          }
        }).filter(p => p.code && p.name)

        resolve(parts)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = (err) => reject(err)
    reader.readAsBinaryString(file)
  })
}
