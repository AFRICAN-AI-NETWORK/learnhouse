/**
 * Storage quota policy.
 *
 * Owns every decision about how much space the offline cache may consume and
 * which assets get evicted when the budget is exceeded.
 */

import { openDb, reportOfflineError } from './db'
import { CACHE_NAMES, OFFLINE_DEFAULTS, STORAGE_KEYS } from './constants'
import { capabilities, getCacheMaxMb } from './config'

const BYTES_PER_MB = 1024 * 1024

export interface StorageUsage {
  used: number
  quota: number
  /** Budget in bytes, derived from config + whether storage is persisted. */
  budget: number
  percentUsed: number
  percentOfBudget: number
  withinBudget: boolean
  /** True once usage crosses the warn watermark — surfaced in the UI. */
  shouldWarn: boolean
  persisted: boolean
}

/** True when the browser previously granted persistent storage. */
export function isPersistentStorageGranted(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.localStorage.getItem(STORAGE_KEYS.PERSISTENT_GRANTED) === 'true'
    )
  } catch {
    return false
  }
}

/**
 * Requests persistent storage once, on install.
 *
 * A denied request is not an error — it only lowers the budget and raises a UI
 * warning, because the browser may evict our cache under pressure.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage) return false

  try {
    // Respect an existing grant rather than re-prompting.
    if (typeof navigator.storage.persisted === 'function') {
      const already = await navigator.storage.persisted()
      if (already) {
        persistGrantFlag(true)
        return true
      }
    }

    if (typeof navigator.storage.persist !== 'function') return false

    const granted = await navigator.storage.persist()
    persistGrantFlag(granted)
    return granted
  } catch (error) {
    reportOfflineError('persistent_storage_request_failed', error)
    return false
  }
}

function persistGrantFlag(granted: boolean): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.PERSISTENT_GRANTED,
      granted ? 'true' : 'false'
    )
  } catch {
    // Private-mode or quota-blocked localStorage: non-fatal.
  }
}

/** Reports current usage against the configured budget. */
export async function getStorageUsage(): Promise<StorageUsage> {
  const persisted = isPersistentStorageGranted()
  const budget = getCacheMaxMb(persisted) * BYTES_PER_MB

  const empty: StorageUsage = {
    used: 0,
    quota: 0,
    budget,
    percentUsed: 0,
    percentOfBudget: 0,
    withinBudget: true,
    shouldWarn: false,
    persisted,
  }

  if (!capabilities.hasStorageManager()) return empty

  try {
    const estimate = await navigator.storage.estimate()
    const used = estimate.usage ?? 0
    const quota = estimate.quota ?? 0
    const percentOfBudget = budget > 0 ? used / budget : 0

    return {
      used,
      quota,
      budget,
      percentUsed: quota > 0 ? used / quota : 0,
      percentOfBudget,
      withinBudget: used <= budget,
      shouldWarn: percentOfBudget >= OFFLINE_DEFAULTS.WARN_WATERMARK,
      persisted,
    }
  } catch (error) {
    reportOfflineError('storage_estimate_failed', error)
    return empty
  }
}

/** True when a large write should be preceded by eviction (plan Risk 6). */
export async function shouldEvictBeforeWrite(): Promise<boolean> {
  const usage = await getStorageUsage()
  return usage.percentOfBudget >= OFFLINE_DEFAULTS.EVICTION_HIGH_WATERMARK
}

/**
 * Evicts least-recently-accessed media until usage is back under budget.
 *
 * Ordering is deliberate: the index row is deleted *before* the
 * Cache Storage entry. If the cache delete then fails we are left with an
 * untracked-but-present asset — wasteful, and reclaimed by the next eviction
 * sweep — whereas the reverse order would leave the index claiming an asset is
 * available offline when it is gone, which makes the UI lie to the user.
 *
 * @returns number of assets evicted.
 */
export async function evictLRUMedia(): Promise<number> {
  const db = await openDb()
  if (!db) return 0

  const usage = await getStorageUsage()
  if (usage.withinBudget) return 0

  let bytesToFree = usage.used - usage.budget
  if (bytesToFree <= 0) return 0

  let evicted = 0

  try {
    const candidates = await db.media_cache_index
      .orderBy('last_accessed_at')
      .toArray()

    const mediaCache = (await caches.open(CACHE_NAMES.MEDIA)) ?? null

    for (let i = 0; i < candidates.length && bytesToFree > 0; i++) {
      const entry = candidates[i]

      // 1. Drop the index row first — never claim availability we can't honour.
      try {
        await db.media_cache_index.delete(entry.url)
      } catch (error) {
        reportOfflineError('media_index_delete_failed', error)
        // Abort rather than orphan the cache entry silently.
        break
      }

      // 2. Then release the bytes.
      if (mediaCache) {
        try {
          await mediaCache.delete(entry.url)
        } catch (error) {
          reportOfflineError('media_cache_delete_failed', error)
        }
      }

      bytesToFree -= entry.size_bytes
      evicted++
    }
  } catch (error) {
    reportOfflineError('media_eviction_failed', error)
  }

  return evicted
}

/**
 * Deletes every app-owned Cache Storage bucket.
 * Called on logout and on user switch so no authenticated response outlives
 * the session that fetched it (S4).
 */
export async function purgeAllAppCaches(): Promise<void> {
  if (typeof caches === 'undefined') return

  try {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((key) => key.indexOf('lh-') === 0)
        .map((key) => caches.delete(key))
    )
  } catch (error) {
    reportOfflineError('cache_purge_failed', error)
  }
}

/** Records a freshly cached media asset so it participates in LRU eviction. */
export async function trackMediaAsset(
  url: string,
  sizeBytes: number,
  courseUuid?: string
): Promise<void> {
  const db = await openDb()
  if (!db) return

  const now = Date.now()
  try {
    await db.media_cache_index.put({
      url,
      course_uuid: courseUuid,
      size_bytes: sizeBytes,
      cached_at: now,
      last_accessed_at: now,
    })
  } catch (error) {
    reportOfflineError('media_track_failed', error)
  }
}

/** Bumps an asset's LRU position. Failures are silent — this is a hint, not state. */
export async function touchMediaAsset(url: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await db.media_cache_index.update(url, { last_accessed_at: Date.now() })
  } catch {
    // Non-fatal.
  }
}
