/**
 * Utility functions for parsing, serializing, and managing part tags.
 */

export const COMMON_TAG_SUGGESTIONS = [
  'DeLonghi',
  'Saeco',
  'Philips',
  'Jura',
  'Nivona',
  'Melitta',
  'Krups',
  'Bosch',
  'Siemens',
  'Spidem',
  'Gaggia',
  '230V',
  'Оригинал',
  'Аналог'
]

/**
 * Safely parses tags from JSON array, comma-separated string, or string array.
 */
export function parseTags(raw?: string | null | string[]): string[] {
  if (!raw) return []

  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map(t => String(t).trim()).filter(Boolean)))
  }

  const str = String(raw).trim()
  if (!str) return []

  // Check if it's stored as a JSON array
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map(t => String(t).trim()).filter(Boolean)))
      }
    } catch {
      // Fall through to delimiter parsing
    }
  }

  // Parse comma, semicolon or newline delimited string
  return Array.from(
    new Set(
      str
        .split(/[,;\n]/)
        .map(t => t.trim())
        .filter(Boolean)
    )
  )
}

/**
 * Serializes an array of tags to a JSON string for database storage.
 */
export function serializeTags(tags?: string[] | null): string {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return '[]'
  const unique = Array.from(new Set(tags.map(t => String(t).trim()).filter(Boolean)))
  return JSON.stringify(unique)
}
