/**
 * Explicit "download for offline" pipeline.
 *
 * Why this is opt-in rather than automatic: an org with hundreds of courses would
 * blow the storage budget if everything synced eagerly (plan Risk 3). The learner
 * chooses what to take offline, and can give the space back.
 *
 * Media is fetched through the Cache Storage API so the service worker's
 * `CacheFirst` media rule serves the same entries later, and every asset is
 * recorded in `media_cache_index` so LRU eviction can reclaim it.
 */

import { getAPIUrl, getBackendUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { openDb } from './db'
import { reportOfflineError, trackCourseDownloaded } from './telemetry'
import { primeReadCache } from './swr-fetcher'
import { CACHE_NAMES } from './constants'
import { isVideoCacheEnabled } from './config'
import {
  trackMediaAsset,
  evictLRUMedia,
  shouldEvictBeforeWrite,
  getStorageUsage,
} from './storage-policy'

export interface DownloadProgress {
  phase: 'metadata' | 'activities' | 'media' | 'done'
  completed: number
  total: number
}

export interface DownloadResult {
  ok: boolean
  activities: number
  mediaCached: number
  mediaFailed: number
  error?: string
}

type ProgressCallback = (progress: DownloadProgress) => void

/** File extensions we are willing to store offline. */
const CACHEABLE_MEDIA = /\.(png|jpe?g|gif|webp|svg|pdf)(\?|$)/i
const VIDEO_MEDIA = /\.(mp4|webm|m4v)(\?|$)/i

/**
 * Extracts candidate media URLs from an arbitrary activity/block payload.
 *
 * Content shapes vary across block types, so rather than encoding every schema we
 * walk the object and collect anything that looks like a same-origin asset URL.
 * Being shape-agnostic here means new block types work without changes.
 */
function collectMediaUrls(payload: unknown, backendUrl: string): string[] {
  const found = new Set<string>()
  const allowVideo = isVideoCacheEnabled()

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) return

    if (typeof node === 'string') {
      const isAsset =
        CACHEABLE_MEDIA.test(node) || (allowVideo && VIDEO_MEDIA.test(node))
      if (!isAsset) return

      // Only same-origin/backend assets. Third-party embeds (YouTube in
      // particular) must never be cached — their terms prohibit it.
      if (node.startsWith('http')) {
        if (node.startsWith(backendUrl)) found.add(node)
        return
      }
      if (node.startsWith('/')) {
        found.add(backendUrl.replace(/\/$/, '') + node)
      }
      return
    }

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    if (typeof node === 'object') {
      Object.values(node as Record<string, unknown>).forEach(visit)
    }
  }

  visit(payload)
  return Array.from(found)
}

/**
 * Downloads a course's structure and media for offline use.
 *
 * Media failures are counted, not thrown: a course whose thumbnail 404s is still
 * perfectly usable offline, and failing the whole download would be worse than
 * degrading one image to the placeholder.
 */
export async function downloadCourse(
  courseUuid: string,
  accessToken: string,
  onProgress?: ProgressCallback
): Promise<DownloadResult> {
  const api = getAPIUrl()
  const backendUrl = getBackendUrl()
  const report = (progress: DownloadProgress) => onProgress?.(progress)

  let mediaCached = 0
  let mediaFailed = 0

  try {
    report({ phase: 'metadata', completed: 0, total: 3 })

    const metaUrl = `${api}courses/${courseUuid}/meta`
    const meta = await swrFetcher(metaUrl, accessToken)
    await primeReadCache(metaUrl, meta)
    await persistCourse(meta, courseUuid)

    report({ phase: 'activities', completed: 1, total: 3 })

    const chapters: any[] = meta?.chapters ?? []
    const activities: any[] = []
    chapters.forEach((chapter) => {
      const list = chapter?.activities ?? []
      list.forEach((activity: any) => activities.push(activity))
    })

    await persistStructure(courseUuid, chapters, activities)

    report({ phase: 'media', completed: 2, total: 3 })

    // Reclaim space before a potentially large write rather than failing midway.
    if (await shouldEvictBeforeWrite()) {
      await evictLRUMedia()
    }

    const mediaUrls = collectMediaUrls(meta, backendUrl)
    const result = await cacheMedia(mediaUrls, courseUuid)
    mediaCached = result.cached
    mediaFailed = result.failed

    report({ phase: 'done', completed: 3, total: 3 })

    trackCourseDownloaded({
      activities: activities.length,
      mediaCached,
      mediaFailed,
    })

    return { ok: true, activities: activities.length, mediaCached, mediaFailed }
  } catch (error) {
    reportOfflineError('course_download_failed', error)
    return {
      ok: false,
      activities: 0,
      mediaCached,
      mediaFailed,
      error: error instanceof Error ? error.message : 'Download failed',
    }
  }
}

async function persistCourse(meta: any, courseUuid: string): Promise<void> {
  const db = await openDb()
  if (!db || !meta) return

  try {
    await db.courses.put({
      id: meta.id ?? 0,
      course_uuid: meta.course_uuid ?? courseUuid,
      org_id: meta.org_id ?? 0,
      slug: meta.slug,
      data: meta,
      cached_at: Date.now(),
    })
  } catch (error) {
    reportOfflineError('course_persist_failed', error)
  }
}

async function persistStructure(
  courseUuid: string,
  chapters: any[],
  activities: any[]
): Promise<void> {
  const db = await openDb()
  if (!db) return

  const now = Date.now()

  try {
    await db.transaction('rw', [db.chapters, db.activities], async () => {
      if (chapters.length > 0) {
        await db.chapters.bulkPut(
          chapters
            .filter((chapter) => chapter?.id)
            .map((chapter) => ({
              id: chapter.id,
              course_id: chapter.course_id ?? 0,
              data: chapter,
              cached_at: now,
            }))
        )
      }

      if (activities.length > 0) {
        await db.activities.bulkPut(
          activities
            .filter((activity) => activity?.id)
            .map((activity) => ({
              id: activity.id,
              activity_uuid: activity.activity_uuid ?? String(activity.id),
              chapter_id: activity.chapter_id ?? null,
              course_id: activity.course_id ?? null,
              type: activity.activity_type ?? activity.type ?? 'UNKNOWN',
              data: activity,
              cached_at: now,
            }))
        )
      }
    })
  } catch (error) {
    reportOfflineError('structure_persist_failed', error)
  }
}

async function cacheMedia(
  urls: string[],
  courseUuid: string
): Promise<{ cached: number; failed: number }> {
  if (typeof caches === 'undefined' || urls.length === 0) {
    return { cached: 0, failed: 0 }
  }

  let cached = 0
  let failed = 0

  try {
    const mediaCache = await caches.open(CACHE_NAMES.MEDIA)

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      try {
        const response = await fetch(url, { credentials: 'include' })
        if (!response.ok) {
          failed++
          continue
        }

        // Clone before caching: a Response body can only be consumed once.
        const size = Number(response.headers.get('content-length') ?? 0)
        await mediaCache.put(url, response.clone())
        await trackMediaAsset(url, size, courseUuid)
        cached++
      } catch {
        failed++
      }
    }
  } catch (error) {
    reportOfflineError('media_cache_failed', error)
  }

  return { cached, failed }
}

/** True when this course's metadata is already stored locally. */
export async function isCourseDownloaded(courseUuid: string): Promise<boolean> {
  const db = await openDb()
  if (!db) return false
  try {
    const row = await db.courses.where('course_uuid').equals(courseUuid).first()
    return row !== undefined
  } catch {
    return false
  }
}

/** When this course was last downloaded, or null if it is not stored. */
export async function getCourseDownloadedAt(
  courseUuid: string
): Promise<number | null> {
  const db = await openDb()
  if (!db) return null
  try {
    const row = await db.courses.where('course_uuid').equals(courseUuid).first()
    return row?.cached_at ?? null
  } catch {
    return null
  }
}

/**
 * Removes a course from offline storage and reclaims its media.
 *
 * Progress and outbox rows are intentionally preserved: deleting a download must
 * never discard work the learner has not yet synced.
 */
export async function removeCourseDownload(courseUuid: string): Promise<void> {
  const db = await openDb()
  if (!db) return

  try {
    const course = await db.courses
      .where('course_uuid')
      .equals(courseUuid)
      .first()

    const assets = await db.media_cache_index
      .where('course_uuid')
      .equals(courseUuid)
      .toArray()

    if (typeof caches !== 'undefined') {
      const mediaCache = await caches.open(CACHE_NAMES.MEDIA)
      for (let i = 0; i < assets.length; i++) {
        try {
          await mediaCache.delete(assets[i].url)
        } catch {
          // Leaves an untracked entry; the next eviction sweep reclaims it.
        }
      }
    }

    await db.transaction(
      'rw',
      [db.courses, db.chapters, db.activities, db.media_cache_index],
      async () => {
        await db.media_cache_index
          .where('course_uuid')
          .equals(courseUuid)
          .delete()

        if (course) {
          await db.chapters.where('course_id').equals(course.id).delete()
          await db.activities.where('course_id').equals(course.id).delete()
          await db.courses.delete(course.id)
        }
      }
    )
  } catch (error) {
    reportOfflineError('course_remove_failed', error)
  }
}

/** Per-course storage summary for the settings screen. */
export async function getDownloadedCourses(): Promise<
  Array<{
    courseUuid: string
    name: string
    sizeBytes: number
    cachedAt: number
  }>
> {
  const db = await openDb()
  if (!db) return []

  try {
    const courses = await db.courses.toArray()
    const assets = await db.media_cache_index.toArray()

    return courses.map((course) => {
      const sizeBytes = assets
        .filter((asset) => asset.course_uuid === course.course_uuid)
        .reduce((total, asset) => total + asset.size_bytes, 0)

      return {
        courseUuid: course.course_uuid,
        name: course.data?.name ?? 'Untitled course',
        sizeBytes,
        cachedAt: course.cached_at,
      }
    })
  } catch {
    return []
  }
}

export { getStorageUsage }
