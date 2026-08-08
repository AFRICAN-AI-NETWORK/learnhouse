/**
 * Client-side search over cached content (plan Layer 5.18).
 *
 * A deliberate downgrade from the server's search: this is a case-insensitive
 * substring match over locally cached names and descriptions. It exists so the
 * search box still does something useful offline, not to replicate relevance
 * ranking. Results are labelled `cached: true` so the UI can be honest about that.
 */

import { openDb } from './db'

export interface OfflineSearchResult {
  id: number | string
  type: 'course' | 'activity' | 'chapter' | 'collection'
  name: string
  description?: string
  /** Route target, when one can be derived from the cached record. */
  href?: string
  /** Always true — lets the UI badge these as offline results. */
  cached: true
}

function matches(haystack: unknown, needle: string): boolean {
  return typeof haystack === 'string' && haystack.toLowerCase().includes(needle)
}

/**
 * Searches cached courses, activities, chapters and collections.
 *
 * @param query raw user input; blank input returns nothing rather than everything.
 * @param limit caps work and result size on large local libraries.
 */
export async function searchOfflineContent(
  query: string,
  limit = 20
): Promise<OfflineSearchResult[]> {
  const needle = query.trim().toLowerCase()
  if (needle.length === 0) return []

  const db = await openDb()
  if (!db) return []

  const results: OfflineSearchResult[] = []

  try {
    const courses = await db.courses.toArray()
    courses.forEach((row) => {
      const data = row.data ?? {}
      if (matches(data.name, needle) || matches(data.description, needle)) {
        results.push({
          id: row.id,
          type: 'course',
          name: data.name ?? 'Untitled course',
          description: data.description,
          href: `/course/${row.course_uuid}`,
          cached: true,
        })
      }
    })

    const activities = await db.activities.toArray()
    activities.forEach((row) => {
      const data = row.data ?? {}
      if (matches(data.name, needle)) {
        results.push({
          id: row.id,
          type: 'activity',
          name: data.name ?? 'Untitled activity',
          cached: true,
        })
      }
    })

    const chapters = await db.chapters.toArray()
    chapters.forEach((row) => {
      const data = row.data ?? {}
      if (matches(data.name, needle)) {
        results.push({
          id: row.id,
          type: 'chapter',
          name: data.name ?? 'Untitled chapter',
          cached: true,
        })
      }
    })

    const collections = await db.collections.toArray()
    collections.forEach((row) => {
      const data = row.data ?? {}
      if (matches(data.name, needle) || matches(data.description, needle)) {
        results.push({
          id: row.id,
          type: 'collection',
          name: data.name ?? 'Untitled collection',
          description: data.description,
          cached: true,
        })
      }
    })
  } catch {
    // A failed local search returns nothing rather than breaking the page.
    return results.slice(0, limit)
  }

  return results.slice(0, limit)
}

/**
 * Merges server and cached results, preferring the server's copy of a record.
 * Dedupes on `type:id` so the same course cannot appear twice.
 */
export function mergeSearchResults(
  serverResults: any[],
  cachedResults: OfflineSearchResult[]
): any[] {
  const seen = new Set<string>()
  const merged: any[] = []

  serverResults.forEach((item) => {
    const key = `${item?.type ?? 'unknown'}:${item?.id ?? ''}`
    seen.add(key)
    merged.push(item)
  })

  cachedResults.forEach((item) => {
    const key = `${item.type}:${item.id}`
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  })

  return merged
}
