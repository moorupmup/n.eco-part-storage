import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capacitor-community/file-opener'
import type { Part, PartArticle, Transaction } from '~/types'
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
  // 1. Детальная таблица по всем артикулам (каждый артикул внутри детали - отдельная строка)
  const articleRows: any[] = []
  let rowNumber = 1

  for (const p of parts) {
    const tagList = p.tags && p.tags.length > 0 ? p.tags : parseTags(p.notes)
    const articles = Array.isArray(p.articles) && p.articles.length > 0
      ? p.articles
      : [{
          id: `art-${p.id}-1`,
          code: p.code || '',
          name: '',
          stock_new: p.stock_new,
          stock_used: p.stock_used,
          min_stock: p.min_stock,
          price_new: p.price_new,
          price_used: p.price_used
        }]

    for (const a of articles) {
      const stockNew = Number(a.stock_new) || 0
      const stockUsed = Number(a.stock_used) || 0
      const totalStock = stockNew + stockUsed
      const minStock = a.min_stock !== undefined ? a.min_stock : (p.min_stock || 0)
      const priceNew = a.price_new !== undefined ? a.price_new : (p.price_new || 0)
      const priceUsed = a.price_used !== undefined ? a.price_used : (p.price_used || 0)

      articleRows.push({
        '№': rowNumber++,
        'ID детали': p.id,
        'Деталь': p.name,
        'Категория': p.category || 'Без категории',
        'Артикул': a.code,
        'Название артикула / Примечание': a.name || '',
        'Новые (шт)': stockNew,
        'Б/У (шт)': stockUsed,
        'Всего (шт)': totalStock,
        'Мин. остаток (шт)': minStock,
        'Цена новая (руб)': priceNew,
        'Цена б/у (руб)': priceUsed,
        'Теги детали': tagList.join(', '),
        'Обновлено': p.updated_at ? new Date(p.updated_at).toLocaleDateString('ru-RU') : ''
      })
    }
  }

  // 2. Сводная таблица по деталям (1 строка = 1 деталь со списком всех артикулов и суммарными остатками)
  const summaryRows = parts.map((p, idx) => {
    const tagList = p.tags && p.tags.length > 0 ? p.tags : parseTags(p.notes)
    const allArticleCodes = (p.articles && p.articles.length > 0)
      ? p.articles.map(a => a.code + (a.name ? ` (${a.name})` : '')).join('; ')
      : (p.code || '')

    return {
      '№': idx + 1,
      'ID детали': p.id,
      'Деталь': p.name,
      'Категория': p.category || 'Без категории',
      'Все артикулы детали': allArticleCodes,
      'Новые суммарно (шт)': p.stock_new,
      'Б/У суммарно (шт)': p.stock_used,
      'Всего (шт)': p.stock_new + p.stock_used,
      'Мин. остаток (шт)': p.min_stock,
      'Теги': tagList.join(', '),
      'Обновлено': p.updated_at ? new Date(p.updated_at).toLocaleDateString('ru-RU') : ''
    }
  })

  const workbook = XLSX.utils.book_new()

  // Лист 1: Все артикулы (основной детальный лист)
  const worksheetArticles = XLSX.utils.json_to_sheet(articleRows)
  worksheetArticles['!cols'] = [
    { wch: 5 },  // №
    { wch: 10 }, // ID детали
    { wch: 38 }, // Деталь
    { wch: 22 }, // Категория
    { wch: 18 }, // Артикул
    { wch: 34 }, // Название артикула / Примечание
    { wch: 12 }, // Новые (шт)
    { wch: 10 }, // Б/У (шт)
    { wch: 12 }, // Всего (шт)
    { wch: 16 }, // Мин. остаток (шт)
    { wch: 16 }, // Цена новая (руб)
    { wch: 15 }, // Цена б/у (руб)
    { wch: 28 }, // Теги детали
    { wch: 14 }  // Обновлено
  ]
  XLSX.utils.book_append_sheet(workbook, worksheetArticles, 'Артикулы')

  // Лист 2: Сводно по деталям
  const worksheetSummary = XLSX.utils.json_to_sheet(summaryRows)
  worksheetSummary['!cols'] = [
    { wch: 5 },  // №
    { wch: 10 }, // ID детали
    { wch: 38 }, // Деталь
    { wch: 22 }, // Категория
    { wch: 45 }, // Все артикулы детали
    { wch: 20 }, // Новые суммарно (шт)
    { wch: 18 }, // Б/У суммарно (шт)
    { wch: 12 }, // Всего (шт)
    { wch: 16 }, // Мин. остаток (шт)
    { wch: 28 }, // Теги
    { wch: 14 }  // Обновлено
  ]
  XLSX.utils.book_append_sheet(workbook, worksheetSummary, 'Сводно по запчастям')

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
    'Артикул': t.article_code || t.part_code || '',
    'Деталь': t.part_name || '',
    'Тип операции': typeMap[t.type] || t.type,
    'Состояние': t.condition === 'NEW' ? 'Новая' : 'Б/У',
    'Количество': t.quantity,
    'Было': t.stock_before,
    'Стало': t.stock_after,
    'Причина / Наряд': t.reason
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet['!cols'] = [
    { wch: 8 },  // ID
    { wch: 20 }, // Дата
    { wch: 18 }, // Артикул
    { wch: 35 }, // Деталь
    { wch: 22 }, // Тип операции
    { wch: 12 }, // Состояние
    { wch: 12 }, // Количество
    { wch: 10 }, // Было
    { wch: 10 }, // Стало
    { wch: 30 }  // Причина / Наряд
  ]
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

        // Группируем строки по ID детали (если есть) или по комбинации (название детали + категория)
        const partsMap = new Map<string, {
          id?: number
          name: string
          category: string
          location: string
          tags: string[]
          min_stock: number
          articles: PartArticle[]
        }>()

        for (const r of rows) {
          const partName = String(r['Деталь'] || r['Наименование детали'] || r['Наименование'] || r['Название'] || r['name'] || '').trim()
          const articleCode = String(r['Артикул'] || r['Артикул / Код'] || r['Код'] || r['code'] || '').trim()
          if (!partName && !articleCode) continue

          const finalPartName = partName || articleCode
          const category = String(r['Категория'] || r['category'] || '').trim()
          const partIdRaw = r['ID детали'] || r['ID'] || r['id']
          const partId = Number(partIdRaw) || undefined

          const groupKey = partId
            ? `id:${partId}`
            : `name:${finalPartName.toLowerCase()}::${category.toLowerCase()}`

          const articleName = String(
            r['Название артикула / Примечание'] ||
            r['Примечание к артикулу'] ||
            r['Название артикула'] ||
            r['articleName'] ||
            ''
          ).trim()

          const stockNew = Number(r['Новые (шт)'] || r['Новые'] || r['stock_new'] || 0)
          const stockUsed = Number(r['Б/У (шт)'] || r['Б/У'] || r['stock_used'] || 0)
          const minStock = Number(r['Мин. остаток (шт)'] || r['Мин. остаток'] || r['min_stock'] || 0)
          const priceNew = Number(r['Цена новая (руб)'] || r['Цена новая'] || r['price_new'] || 0)
          const priceUsed = Number(r['Цена б/у (руб)'] || r['Цена б/у'] || r['price_used'] || 0)

          const rawTags = r['Теги детали'] || r['Теги'] || r['tags'] || r['Примечание'] || r['notes'] || ''
          const tagList = parseTags(rawTags)

          const currentPart = partsMap.get(groupKey) || {
            id: partId,
            name: finalPartName,
            category,
            location: String(r['Ячейка / Место'] || r['Ячейка'] || r['location'] || '').trim(),
            tags: tagList,
            min_stock: minStock,
            articles: []
          }

          const finalCode = articleCode || finalPartName
          currentPart.articles.push({
            id: `art-${Date.now()}-${currentPart.articles.length + 1}`,
            code: finalCode,
            name: articleName,
            stock_new: stockNew,
            stock_used: stockUsed,
            min_stock: minStock,
            price_new: priceNew,
            price_used: priceUsed
          })

          if (tagList.length > 0) {
            const combined = new Set([...currentPart.tags, ...tagList])
            currentPart.tags = Array.from(combined)
          }

          partsMap.set(groupKey, currentPart)
        }

        const parts: Partial<Part>[] = Array.from(partsMap.values()).map(p => {
          const totalNew = p.articles.reduce((s, a) => s + (Number(a.stock_new) || 0), 0)
          const totalUsed = p.articles.reduce((s, a) => s + (Number(a.stock_used) || 0), 0)
          const primaryCode = p.articles[0]?.code || ''
          const minStockTotal = p.articles.reduce((s, a) => s + (Number(a.min_stock) || 0), 0) || p.min_stock

          return {
            id: p.id,
            code: primaryCode,
            name: p.name,
            category: p.category,
            location: p.location,
            articles: p.articles,
            stock_new: totalNew,
            stock_used: totalUsed,
            min_stock: minStockTotal,
            price_new: p.articles[0]?.price_new || 0,
            price_used: p.articles[0]?.price_used || 0,
            notes: serializeTags(p.tags),
            tags: p.tags
          }
        })

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
  worksheet['!cols'] = [
    { wch: 5 },  // №
    { wch: 35 }, // Деталь
    { wch: 22 }, // Категория
    { wch: 18 }, // Артикул
    { wch: 30 }, // Примечание
    { wch: 12 }, // Новые (шт)
    { wch: 10 }, // Б/У (шт)
    { wch: 12 }, // Всего (шт)
    { wch: 18 }, // Мин. с собой (шт)
    { wch: 24 }  // Требуется пополнить (шт)
  ]
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
  worksheet['!cols'] = [
    { wch: 5 },  // №
    { wch: 35 }, // Деталь
    { wch: 22 }, // Категория
    { wch: 18 }, // Артикул
    { wch: 30 }, // Примечание
    { wch: 16 }, // Текущий остаток
    { wch: 18 }, // Мин. с собой (шт)
    { wch: 16 }  // Требуется (шт)
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Закончились')
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  return await saveOrDownloadFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
