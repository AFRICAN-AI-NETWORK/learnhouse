/**
 * Sync engine.
 *
 * Runs in the page, not the worker: it needs the live session token and it emits
 * progress so the UI can show sync state. Responsible for populating IndexedDB
 * from the network and for the read side of the offline cache.
 *
 * PERMISSION SAFETY (S7): `incrementalSync` refreshes roles and org membership
 * FIRST. If access was revoked while the user was offline, the now-forbidden
 * content is evicted before anything renders it.
 */

import { openDb, reportOfflineError } from './db'
import type { UserProgressRecord } from './db'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { primeReadCache } from './swr-fetcher'
import { canPersistRead } from './policy'
import { OFFLINE_DEFAULTS } from './constants'
import { drainOutbox } from './drain'
import { isOffline } from './connection'
import { shouldEvictBeforeWrite, evictLRUMedia } from './storage-policy'

export interface SyncProgress {
  phase: 'permissions' | 'org' | 'courses' | 'content' | 'trail' | 'done'
  completed: number
  total: number
  message?: string
}

type ProgressListener = (progress: SyncProgress) => void

export interface SyncContext {
  orgSlug: string
  userId: number
  accessToken: string
}

export class SyncEngine {
  private listeners = new Set<ProgressListener>()
  private incrementalTimer: ReturnType<typeof setInterval> | null = null
  private running = false

  onProgress(listener: ProgressListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit(progress: SyncProgress): void {
    Array.from(this.listeners).forEach((listener) => {
      try {
        listener(progress)
      } catch {
        // A listener must never break a sync.
      }
    })
  }

  /**
   * Fetches a URL and mirrors it into the read cache.
   * Policy is consulted centrally, so a sensitive endpoint can never be persisted
   * even if a future caller adds it to a sync list by mistake.
   */
  private async fetchAndCache(
    url: string,
    accessToken: string
  ): Promise<any | null> {
    try {
      const data = await swrFetcher(url, accessToken)
      if (canPersistRead(url)) {
        await primeReadCache(url, data)
      }
      return data
    } catch (error) {
      reportOfflineError('sync_fetch_failed', error)
      return null
    }
  }

  /**
   * First-run population (plan Layer 4.1 `initialSync`).
   *
   * Idempotent: every write is a keyed upsert, so running it twice converges on
   * the same state. Deliberately scoped to the org shell, the course list, and the
   * user's own trail — NOT every course in the library, which would blow the
   * storage budget on large orgs (plan Risk 3). Full course content is pulled on
   * demand or via the explicit download action.
   */
  async initialSync(context: SyncContext): Promise<void> {
    if (this.running || isOffline()) return
    this.running = true

    const api = getAPIUrl()

    try {
      this.emit({ phase: 'permissions', completed: 0, total: 4 })
      await this.syncPermissions(context)

      this.emit({ phase: 'org', completed: 1, total: 4 })
      const org = await this.fetchAndCache(
        `${api}orgs/slug/${context.orgSlug}`,
        context.accessToken
      )
      if (org) await this.persistOrg(org)

      this.emit({ phase: 'courses', completed: 2, total: 4 })
      const courses = await this.fetchAndCache(
        `${api}courses/org_slug/${context.orgSlug}/page/1/limit/100`,
        context.accessToken
      )
      if (courses) await this.persistCourses(courses, org?.id ?? 0)

      this.emit({ phase: 'trail', completed: 3, total: 4 })
      // The trail endpoint is keyed by org ID, not slug, so it can only run once
      // the org has been resolved above.
      if (org?.id) {
        await this.fetchAndCache(
          `${api}trail/org/${org.id}/trail`,
          context.accessToken
        )
      }

      await this.setSyncedAt('initial')
      this.emit({ phase: 'done', completed: 4, total: 4 })
    } catch (error) {
      reportOfflineError('initial_sync_failed', error)
    } finally {
      this.running = false
    }
  }

  /**
   * Refreshes roles and org membership.
   * Always runs before content sync so revoked access is honoured immediately.
   */
  private async syncPermissions(context: SyncContext): Promise<void> {
    const api = getAPIUrl()
    const session = await this.fetchAndCache(
      `${api}users/session`,
      context.accessToken
    )

    if (!session) return

    const db = await openDb()
    if (!db) return

    try {
      const rows = await db.sessions.toArray()
      if (rows.length === 0) return

      const previousRoles = JSON.stringify(rows[0].roles ?? null)
      const nextRoles = JSON.stringify(session.roles ?? null)

      await db.sessions.update(rows[0].user_id, {
        roles: session.roles ?? null,
      })

      // Permissions changed while offline — drop cached content so nothing
      // gated by the old role set can still be read (S7).
      if (previousRoles !== nextRoles) {
        await this.evictContentCaches()
      }
    } catch (error) {
      reportOfflineError('permission_sync_failed', error)
    }
  }

  /** Clears permission-gated content. Progress and outbox rows are preserved. */
  private async evictContentCaches(): Promise<void> {
    const db = await openDb()
    if (!db) return

    try {
      await db.transaction(
        'rw',
        [db.courses, db.chapters, db.activities, db.blocks, db.read_cache],
        async () => {
          await db.courses.clear()
          await db.chapters.clear()
          await db.activities.clear()
          await db.blocks.clear()
          await db.read_cache.clear()
        }
      )
    } catch (error) {
      reportOfflineError('content_evict_failed', error)
    }
  }

  private async persistOrg(org: any): Promise<void> {
    const db = await openDb()
    if (!db || !org?.id) return
    try {
      await db.orgs.put({
        id: org.id,
        slug: org.slug,
        data: org,
        cached_at: Date.now(),
      })
    } catch (error) {
      reportOfflineError('org_persist_failed', error)
    }
  }

  private async persistCourses(payload: any, orgId: number): Promise<void> {
    const db = await openDb()
    if (!db) return

    const list: any[] = Array.isArray(payload)
      ? payload
      : (payload?.courses ?? [])
    if (list.length === 0) return

    const now = Date.now()
    try {
      await db.courses.bulkPut(
        list
          .filter((course) => course?.id)
          .map((course) => ({
            id: course.id,
            course_uuid: course.course_uuid ?? String(course.id),
            org_id: course.org_id ?? orgId,
            slug: course.slug,
            data: course,
            cached_at: now,
          }))
      )
    } catch (error) {
      reportOfflineError('courses_persist_failed', error)
    }
  }

  /**
   * Periodic refresh (plan Layer 4.1 `incrementalSync`).
   * Cheap by design — it re-fetches the small, high-value surfaces and lets the
   * SW's `NetworkFirst` rules keep everything else warm.
   */
  async incrementalSync(context: SyncContext): Promise<void> {
    if (isOffline() || this.running) return

    const api = getAPIUrl()
    try {
      await this.syncPermissions(context)
      await this.fetchAndCache(
        `${api}courses/org_slug/${context.orgSlug}/page/1/limit/100`,
        context.accessToken
      )

      // Trail is addressed by org ID. Reuse the org already stored by the initial
      // sync rather than re-fetching it on every tick.
      const orgId = await this.getCachedOrgId(context.orgSlug)
      if (orgId !== null) {
        await this.fetchAndCache(
          `${api}trail/org/${orgId}/trail`,
          context.accessToken
        )
      }

      await this.setSyncedAt('incremental')
    } catch (error) {
      reportOfflineError('incremental_sync_failed', error)
    }
  }

  /** Org ID for a slug, from the locally stored org record. Null if not synced yet. */
  private async getCachedOrgId(orgSlug: string): Promise<number | null> {
    const db = await openDb()
    if (!db) return null
    try {
      const row = await db.orgs.where('slug').equals(orgSlug).first()
      return row?.id ?? null
    } catch {
      return null
    }
  }

  /** Starts the periodic refresh loop. Returns a stop function. */
  startPeriodicSync(contextProvider: () => SyncContext | null): () => void {
    this.stopPeriodicSync()

    this.incrementalTimer = setInterval(() => {
      const context = contextProvider()
      if (context) void this.incrementalSync(context)
    }, OFFLINE_DEFAULTS.INCREMENTAL_SYNC_INTERVAL_MS)

    return () => this.stopPeriodicSync()
  }

  stopPeriodicSync(): void {
    if (this.incrementalTimer !== null) {
      clearInterval(this.incrementalTimer)
      this.incrementalTimer = null
    }
  }

  private async setSyncedAt(entityType: string): Promise<void> {
    const db = await openDb()
    if (!db) return
    try {
      await db.sync_metadata.put({
        entity_type: entityType,
        last_synced_at: Date.now(),
      })
    } catch {
      // Non-fatal: a missing timestamp only costs a redundant sync.
    }
  }

  /** Timestamp of the last successful sync, for the "last synced" UI. */
  async getLastSyncedAt(entityType = 'incremental'): Promise<number | null> {
    const db = await openDb()
    if (!db) return null
    try {
      const row = await db.sync_metadata.get(entityType)
      return row?.last_synced_at ?? null
    } catch {
      return null
    }
  }

  // ── Cached reads used by page components ──────────────────────────────────

  async getCachedCourses(orgId?: number): Promise<any[]> {
    const db = await openDb()
    if (!db) return []
    try {
      const rows =
        orgId === undefined
          ? await db.courses.toArray()
          : await db.courses.where('org_id').equals(orgId).toArray()
      return rows.map((row) => row.data)
    } catch {
      return []
    }
  }

  async getCachedCourse(courseUuid: string): Promise<any | null> {
    const db = await openDb()
    if (!db) return null
    try {
      const row = await db.courses
        .where('course_uuid')
        .equals(courseUuid)
        .first()
      return row?.data ?? null
    } catch {
      return null
    }
  }

  async getCachedActivity(activityUuid: string): Promise<any | null> {
    const db = await openDb()
    if (!db) return null
    try {
      const row = await db.activities
        .where('activity_uuid')
        .equals(activityUuid)
        .first()
      return row?.data ?? null
    } catch {
      return null
    }
  }

  // ── Write path ────────────────────────────────────────────────────────────

  /**
   * Writes local completion state without touching the outbox.
   *
   * Safe to call **after** a queue entry already exists: see the ordering note in
   * `trail-complete.client.ts`. Queue-first-then-progress means the only possible
   * failure leaves a queued write with no optimistic UI — recoverable and
   * invisible — rather than a completion the server will never hear about.
   */
  async setProgress(params: {
    userId: number
    activityUuid: string
    courseUuid: string
    completed: boolean
    pending: boolean
  }): Promise<boolean> {
    const db = await openDb()
    if (!db) return false

    try {
      await db.user_progress.put({
        key: `${params.userId}:${params.activityUuid}`,
        user_id: params.userId,
        activity_uuid: params.activityUuid,
        course_uuid: params.courseUuid,
        completed: params.completed,
        updated_at: Date.now(),
        pending: params.pending,
      })
      return true
    } catch (error) {
      reportOfflineError('progress_write_failed', error)
      return false
    }
  }

  /**
   * Records local completion state alongside its outbox row **atomically**.
   *
   * Use this when the caller owns both writes. The transaction is the point: if
   * the queue write fails, the optimistic progress write rolls back too, so the
   * UI can never show a completion that will never reach the server.
   */
  async updateProgress(params: {
    userId: number
    activityUuid: string
    courseUuid: string
    completed: boolean
    enqueue: () => Promise<number | null>
  }): Promise<boolean> {
    const db = await openDb()
    if (!db) return false

    const record: UserProgressRecord = {
      key: `${params.userId}:${params.activityUuid}`,
      user_id: params.userId,
      activity_uuid: params.activityUuid,
      course_uuid: params.courseUuid,
      completed: params.completed,
      updated_at: Date.now(),
      pending: true,
    }

    try {
      await db.transaction('rw', [db.user_progress, db.outbox], async () => {
        await db.user_progress.put(record)
        const outboxId = await params.enqueue()
        if (outboxId === null) {
          // Force a rollback: local state must not outlive its queue entry.
          throw new Error('Failed to queue progress update')
        }
      })
      return true
    } catch (error) {
      reportOfflineError('progress_update_failed', error)
      return false
    }
  }

  /** Locally known completion state, for optimistic rendering. */
  async getProgress(
    userId: number,
    activityUuid: string
  ): Promise<UserProgressRecord | null> {
    const db = await openDb()
    if (!db) return null
    try {
      return (await db.user_progress.get(`${userId}:${activityUuid}`)) ?? null
    } catch {
      return null
    }
  }

  /** Manually replays the outbox, evicting media first if space is tight. */
  async drainOutbox(): Promise<void> {
    if (await shouldEvictBeforeWrite()) {
      await evictLRUMedia()
    }
    await drainOutbox()
  }
}

/** Shared instance — one engine per tab. */
export const syncEngine = new SyncEngine()
