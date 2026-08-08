/**
 * `LearnHouseDB` — the client-side database.
 *
 * SCHEMA VERSIONING RULE: every PR that changes these stores MUST bump
 * `DB_VERSION` in `constants.ts` and add a new `.version(n).stores({...})` block
 * below, with an `upgrade()` callback when existing rows need transformation.
 * This mirrors how Alembic versions the server schema.
 *
 * Records are stored in the **verbatim API response shape** so render-time code
 * needs no transformation and stays identical online and offline (plan R5 #3).
 */

import Dexie, { type Table } from 'dexie'
import { DB_NAME, TABLES, type OutboxStatus } from './constants'

// ─── Row types ───────────────────────────────────────────────────────────────

/** Wrapper used for every cached API entity so we can reason about freshness. */
interface CachedRecord {
  /** When this row was written locally (epoch ms). */
  cached_at: number
  /** Owning user, for scoped wipes and cross-user isolation (S2/T6). */
  user_id?: number | null
}

export interface OrgRecord extends CachedRecord {
  id: number
  slug: string
  data: any
}

export interface CourseRecord extends CachedRecord {
  id: number
  course_uuid: string
  org_id: number
  slug?: string
  data: any
}

export interface ChapterRecord extends CachedRecord {
  id: number
  course_id: number
  /** Ordered — chapter order drives navigation. */
  data: any
}

export interface ActivityRecord extends CachedRecord {
  id: number
  activity_uuid: string
  chapter_id: number | null
  course_id: number | null
  /** Enables type-aware caching decisions (e.g. skip live sessions). */
  type: string
  data: any
}

export interface BlockRecord extends CachedRecord {
  id: string
  activity_id: number
  content: any
}

export interface TrailRecord extends CachedRecord {
  id: number
  org_id: number
  data: any
}

export interface TrailStepRecord extends CachedRecord {
  id: number
  trail_id: number
  user_id: number
  data: any
}

/**
 * The user's completion state per activity — the primary reconciliation target
 * on sync (plan Layer 1.2).
 */
export interface UserProgressRecord {
  /** Composite key `${user_id}:${activity_uuid}` keeps upserts idempotent. */
  key: string
  user_id: number
  activity_uuid: string
  course_uuid: string
  completed: boolean
  updated_at: number
  /** Set while an outbox row for this change is still unresolved. */
  pending: boolean
}

export interface AssignmentRecord extends CachedRecord {
  id: number
  activity_id: number | null
  data: any
}

export interface AssignmentSubmissionRecord extends CachedRecord {
  /** Local id; server id lands in `data` once synced. */
  id: string
  assignment_uuid: string
  task_uuid?: string
  user_id: number
  /** DRAFT (local only) | QUEUED (in outbox) | SYNCED (server-confirmed). */
  status: string
  data: any
  updated_at: number
}

/**
 * The write queue.
 *
 * SECURITY (S3): rows deliberately carry **no `Authorization` header and no
 * cookies**. A fresh token is injected at replay time. This keeps a revoked
 * token from being replayable and avoids a secret-at-rest inside a structure
 * whose whole purpose is to be replayed.
 */
export interface OutboxRecord {
  id?: number
  /** Coarse operation label, e.g. `trail.complete_activity`. */
  type: string
  /** Domain grouping used to preserve per-entity ordering during drain. */
  entity_type: string
  /** Absolute endpoint to replay. */
  url: string
  method: string
  /** Serialised JSON payload, or null for bodyless verbs. */
  body: string | null
  /** Non-auth headers only (e.g. Content-Type). Never `Authorization`. */
  headers: Record<string, string>
  /** Sent as `X-Idempotency-Key` so a replay cannot double-apply (plan 7.4). */
  idempotency_key: string
  status: OutboxStatus
  retry_count: number
  created_at: number
  last_attempt_at: number | null
  error_message: string | null
  /** Owning user — enforces cross-user isolation on shared devices. */
  user_id: number | null
}

export interface MediaCacheIndexRecord {
  url: string
  course_uuid?: string
  size_bytes: number
  cached_at: number
  last_accessed_at: number
}

/**
 * The offline session record — one row per user.
 *
 * SECURITY (S6): this stores **non-secret session metadata only**. The access
 * token is deliberately NOT persisted; it is obtained from the live NextAuth
 * session when online. This removes a secret-at-rest entirely rather than
 * relying on client-side encryption that the device owner could trivially undo.
 */
export interface SessionRecord {
  user_id: number
  username?: string
  /** Snapshot of user metadata for rendering the shell offline. */
  user_metadata: any
  /** Role snapshot used to gate offline UI (S7). */
  roles: any
  /** Server-derived absolute timestamp; see clock-skew handling in session-store. */
  grace_until: number
  /** Access-token expiry, for deciding valid vs grace. */
  token_expiry: number
  cached_at: number
}

export interface SyncMetadataRecord {
  entity_type: string
  last_synced_at: number
  etag?: string | null
}

export interface ChatMessageRecord extends CachedRecord {
  id: string
  conversation_id: string
  created_at: number
  data: any
}

export interface CollectionRecord extends CachedRecord {
  id: number
  org_id: number
  data: any
}

export interface CertificationRecord extends CachedRecord {
  id: string
  user_id: number | null
  course_uuid?: string
  data: any
}

export interface MemberRecord extends CachedRecord {
  key: string
  org_id: number
  user_id: number
  data: any
}

export interface ScheduleRecord extends CachedRecord {
  id: string
  org_id: number | null
  course_uuid?: string
  data: any
}

/**
 * Persisted SWR responses — the backing store for the read seam (Seam A).
 * Keyed by request URL so a cached read is an O(1) primary-key lookup.
 */
export interface ReadCacheRecord {
  key: string
  data: any
  cached_at: number
  /** Owning user; rows are never served across users (T6). */
  user_id: number | null
  etag?: string | null
}

// ─── Database ────────────────────────────────────────────────────────────────

export class LearnHouseDB extends Dexie {
  orgs!: Table<OrgRecord, number>
  courses!: Table<CourseRecord, number>
  chapters!: Table<ChapterRecord, number>
  activities!: Table<ActivityRecord, number>
  blocks!: Table<BlockRecord, string>
  trails!: Table<TrailRecord, number>
  trail_steps!: Table<TrailStepRecord, number>
  user_progress!: Table<UserProgressRecord, string>
  assignments!: Table<AssignmentRecord, number>
  assignment_submissions!: Table<AssignmentSubmissionRecord, string>
  outbox!: Table<OutboxRecord, number>
  media_cache_index!: Table<MediaCacheIndexRecord, string>
  sessions!: Table<SessionRecord, number>
  sync_metadata!: Table<SyncMetadataRecord, string>
  chat_messages!: Table<ChatMessageRecord, string>
  collections!: Table<CollectionRecord, number>
  certifications!: Table<CertificationRecord, string>
  members!: Table<MemberRecord, string>
  schedules!: Table<ScheduleRecord, string>
  read_cache!: Table<ReadCacheRecord, string>

  constructor() {
    super(DB_NAME)

    // ── Version 1 ──
    this.version(1).stores({
      [TABLES.ORGS]: 'id, slug, cached_at',
      [TABLES.COURSES]: 'id, course_uuid, org_id, slug, cached_at',
      [TABLES.CHAPTERS]: 'id, course_id, cached_at',
      [TABLES.ACTIVITIES]:
        'id, activity_uuid, chapter_id, course_id, type, cached_at',
      [TABLES.BLOCKS]: 'id, activity_id, cached_at',
      [TABLES.TRAILS]: 'id, org_id, cached_at',
      [TABLES.TRAIL_STEPS]: 'id, trail_id, user_id, cached_at',
      [TABLES.USER_PROGRESS]:
        'key, user_id, activity_uuid, course_uuid, pending, updated_at',
      [TABLES.ASSIGNMENTS]: 'id, activity_id, cached_at',
      [TABLES.ASSIGNMENT_SUBMISSIONS]:
        'id, assignment_uuid, task_uuid, user_id, status, updated_at',
      [TABLES.OUTBOX]:
        '++id, status, created_at, entity_type, idempotency_key, user_id',
      [TABLES.MEDIA_CACHE_INDEX]:
        'url, course_uuid, cached_at, last_accessed_at',
      [TABLES.SESSIONS]: 'user_id, cached_at',
      [TABLES.SYNC_METADATA]: 'entity_type, last_synced_at',
      [TABLES.CHAT_MESSAGES]: 'id, conversation_id, created_at',
      [TABLES.COLLECTIONS]: 'id, org_id, cached_at',
      [TABLES.CERTIFICATIONS]: 'id, user_id, course_uuid, cached_at',
      [TABLES.MEMBERS]: 'key, org_id, user_id, cached_at',
      [TABLES.SCHEDULES]: 'id, org_id, course_uuid, cached_at',
      [TABLES.READ_CACHE]: 'key, cached_at, user_id',
    })
  }
}

let dbInstance: LearnHouseDB | null = null

/**
 * Returns the singleton database handle, opening it lazily.
 *
 * Resilience (plan Risk 8): if opening fails because the on-disk schema is
 * corrupt or unexpected, the database is deleted and recreated. Local data is
 * a cache — it re-syncs from the server — so discarding it is always preferable
 * to leaving the app wedged.
 */
export function getDb(): LearnHouseDB {
  if (!dbInstance) {
    dbInstance = new LearnHouseDB()
  }
  return dbInstance
}

/** Opens the DB, recovering from corruption by recreating it. */
export async function openDb(): Promise<LearnHouseDB | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null

  const db = getDb()
  if (db.isOpen()) return db

  try {
    await db.open()
    return db
  } catch (error) {
    reportOfflineError('indexeddb_open_failed', error)
    try {
      await db.close()
      await Dexie.delete(DB_NAME)
      dbInstance = new LearnHouseDB()
      await dbInstance.open()
      return dbInstance
    } catch (recoveryError) {
      reportOfflineError('indexeddb_recreate_failed', recoveryError)
      return null
    }
  }
}

/**
 * Wipes every table. Used on logout and on user switch (S2).
 *
 * Runs in a single transaction so a partial wipe cannot leave one user's rows
 * visible to the next.
 */
export async function clearAllTables(): Promise<void> {
  const db = await openDb()
  if (!db) return

  const tables = db.tables
  await db.transaction('rw', tables, async () => {
    for (let i = 0; i < tables.length; i++) {
      await tables[i].clear()
    }
  })
}

/**
 * Tags offline failures for Sentry so they can be alerted on separately from
 * regular application errors (plan Layer 11.1), without importing Sentry here.
 */
export function reportOfflineError(context: string, error: unknown): void {
  if (typeof window === 'undefined') return
  const sentry = (window as any).Sentry
  if (sentry && typeof sentry.captureException === 'function') {
    sentry.captureException(error, {
      tags: { offline: true, offline_context: context },
    })
    return
  }
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(`[offline:${context}]`, error)
  }
}
