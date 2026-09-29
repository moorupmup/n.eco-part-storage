import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import type { Part, Transaction } from '~/types'
import { parseTags, serializeTags } from '~/utils/tags'

export interface SaveFileResult {
  success: boolean
  location: string
  filename: string
  uri?: string
}

/**
 * Universal file saver: handles Capacitor native Android/iOS and standard browsers.
 * In mobile browsers, avoids premature URL.revokeObjectURL which causes downloads to fail.
 */
export async function saveOrDownloadFile(
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<SaveFileResult> {
  const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content

  // 1. If running inside Capacitor native Android/iOS app
  if (Capacitor.isNativePlatform()) {
    try {
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string
          const base64 = res.split(',')[1] || res
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(blob)
      const base64Data = await base64Promise

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      })

      // Try opening via file-opener so user can view/share immediately
      try {
        await FileOpener.open({
          filePath: writeResult.uri,
          contentType: mimeType
        })
      } catch {
        // FileOpener is optional, file is already written
      }

      return {
        success: true,
        location: 'папку «Документы»',
        filename,
        uri: writeResult.uri
      }
    } catch (nativeErr) {
      console.warn('Native filesystem write failed, falling back to browser download:', nativeErr)
    }
  }

  // 2. Standard Web Browser download (compatible with mobile Chrome, Safari, desktop)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Delay revoking URL by 60 seconds so mobile browsers have time to complete the download
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a)
      }
    } catch {}
    URL.revokeObjectURL(url)
  }, 60000)

  return {
    success: true,
    location: 'папку «Загрузки» (Downloads)',
    filename
  }
}

/**
 * Web Share API: triggers native Android/iOS share sheet (Telegram, Google Drive, WhatsApp, Files)
 */
export async function shareFile(
  content: Blob | string,
  filename: string,
  mimeType: string = 'application/octet-stream',
  title = 'Экспорт данных N.ECO'
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false
  }

  try {
    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
    const file = new File([blob], filename, { type: mimeType })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title,
        text: `Резервная копия: ${filename}`
      })
      return true
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return true // User dismissed share sheet
    }
    console.warn('Web Share failed:', err)
  }
  return false
}

export async function exportPartsToExcel(parts: Part[], filename = 'neco_parts_backpack.xlsx'): Promise<SaveFileResult> {
  const data = parts.map(p => {
    const tagList = p.tags && p.tags.length > 0 ? p.tags : parseTags(p.notes)
    return {
      'ID': p.id,
      'Артикул / Код': p.code,
      'Наименование': p.name,
      'Категория': p.category,
      'Новые (шт)': p.stock_new,
      'Б/У (шт)': p.stock_used,
      'Всего (шт)': p.stock_new + p.stock_used,
      'Теги': tagList.join(', '),
      'Обновлено': p.updated_at
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Запчасти')
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return await saveOrDownloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export async function exportTransactionsToExcel(transactions: Transaction[], filename = 'istoriya_dvizheniy.xlsx'): Promise<SaveFileResult> {
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
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return await saveOrDownloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export async function exportFullBackupJSON(parts: Part[], transactions: Transaction[], filename?: string): Promise<SaveFileResult> {
  const finalFilename = filename || `backup_neco_${new Date().toISOString().slice(0, 10)}.json`
  const backup = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    parts,
    transactions
  }

  const jsonStr = JSON.stringify(backup, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  return await saveOrDownloadFile(blob, finalFilename, 'application/json')
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
          const rawTags = r['Теги'] || r['tags'] || r['Примечание'] || r['notes'] || ''
          const tagList = parseTags(rawTags)
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
            notes: serializeTags(tagList),
            tags: tagList
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

export interface DeficitArticleExportRow {
  partName: string
  category: string
  code: string
  articleName?: string
  stockNew: number
  stockUsed: number
  totalStock: number
  minStock: number
  deficit: number
}

export async function exportLowStockToExcel(items: DeficitArticleExportRow[], filename = 'malo_zapchastey.xlsx'): Promise<SaveFileResult> {
  const data = items.map((r, i) => ({
    '№': i + 1,
    'Деталь': r.partName,
    'Категория': r.category,
    'Артикул': r.code,
    'Примечание': r.articleName || '',
    'Новые (шт)': r.stockNew,
    'Б/У (шт)': r.stockUsed,
    'Всего (шт)': r.totalStock,
    'Мин. с собой (шт)': r.minStock,
    'Требуется пополнить (шт)': r.deficit
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Мало')
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return await saveOrDownloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

export async function exportOutOfStockToExcel(items: { partName: string; category: string; code: string; articleName?: string; minStock: number }[], filename = 'zakonchilis_zapchasti.xlsx'): Promise<SaveFileResult> {
  const data = items.map((r, i) => ({
    '№': i + 1,
    'Деталь': r.partName,
    'Категория': r.category,
    'Артикул': r.code,
    'Примечание': r.articleName || '',
    'Текущий остаток': 0,
    'Мин. с собой (шт)': r.minStock || '',
    'Требуется (шт)': (r.minStock && r.minStock > 0) ? r.minStock : ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Закончились')
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return await saveOrDownloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
