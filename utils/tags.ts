/**
 * Utility functions for parsing, serializing, and managing part tags.
 */

// No hardcoded suggestions - only actual tags from the user's parts database are used
export const COMMON_TAG_SUGGESTIONS: string[] = []

/**
 * Safely parses tags from JSON array, comma-separated string, or string array.
 */
export function parseTags(raw?: string | null | string[]): string[] {
  if (!raw) return []

  const cleanTag = (t: any) =>
    String(t)
      .trim()
      .replace(/^[\s(\[".]+|[\s)\]".]+$/g, '')
      .trim()

  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map(cleanTag).filter(Boolean)))
  }

  const str = String(raw).trim()
  if (!str) return []

  // Check if it's stored as a JSON array
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.map(cleanTag).filter(Boolean)))
      }
    } catch {
      // Fall through to delimiter parsing
    }
  }

  // Parse comma, semicolon, newline, or sentence-period delimited string
  return Array.from(
    new Set(
      str
        .split(/[,;\n]|\.\s+/)
        .map(cleanTag)
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
