/**
 * Offline subsystem constants — SINGLE SOURCE OF TRUTH.
 *
 * This module is intentionally dependency-free and free of `process.env` reads at
 * module scope so it can be imported by BOTH the page bundle and the service
 * worker bundle (the worker cannot read runtime config — see plan Layer -1 R3/W5).
 *
 * Every default lives here exactly once. `lib/offline/config.ts` layers
 * environment overrides on top for the page context.
 */

/** IndexedDB database name. */
export const DB_NAME = 'LearnHouseDB'

/**
 * IndexedDB schema version.
 *
 * RULE: every PR that changes the `LearnHouseDB` schema MUST bump this and add a
 * corresponding `.version(n).stores({...}).upgrade(...)` block in `db.ts`.
 */
export const DB_VERSION = 1

/** Table names, referenced by both the Dexie layer and the raw-IDB worker layer. */
export const TABLES = {
  ORGS: 'orgs',
  COURSES: 'courses',
  CHAPTERS: 'chapters',
  ACTIVITIES: 'activities',
  BLOCKS: 'blocks',
  TRAILS: 'trails',
  TRAIL_STEPS: 'trail_steps',
  USER_PROGRESS: 'user_progress',
  ASSIGNMENTS: 'assignments',
  ASSIGNMENT_SUBMISSIONS: 'assignment_submissions',
  OUTBOX: 'outbox',
  MEDIA_CACHE_INDEX: 'media_cache_index',
  SESSIONS: 'sessions',
  SYNC_METADATA: 'sync_metadata',
  CHAT_MESSAGES: 'chat_messages',
  COLLECTIONS: 'collections',
  CERTIFICATIONS: 'certifications',
  MEMBERS: 'members',
  SCHEDULES: 'schedules',
  READ_CACHE: 'read_cache',
} as const

/** Background Sync tag. Registered by the page, consumed by the worker. */
export const SYNC_TAG = 'lh-outbox-sync'

/** Cache Storage bucket names. All app caches are `lh-*` so they can be wiped as a set (S4). */
export const CACHE_NAMES = {
  API_DATA: 'lh-api-data-v1',
  MEDIA: 'lh-media-v1',
  IMAGES: 'lh-images-v1',
  FONTS: 'lh-fonts-v1',
} as const

/** Prefix used to enumerate + purge every app-owned cache on logout / user switch. */
export const CACHE_PREFIX = 'lh-'

/** Outbox row lifecycle. */
export const OUTBOX_STATUS = {
  PENDING: 'PENDING',
  RETRYING: 'RETRYING',
  FAILED: 'FAILED',
  /** Terminal: user acknowledged the failure; stops UI alerting. */
  FAILED_DISMISSED: 'FAILED_DISMISSED',
  SYNCED: 'SYNCED',
} as const

export type OutboxStatus = (typeof OUTBOX_STATUS)[keyof typeof OUTBOX_STATUS]

/** Local lifecycle of a user's assignment answer. */
export const SUBMISSION_STATUS = {
  /** Local-only, never sent. */
  DRAFT: 'DRAFT',
  /** In the outbox, awaiting replay. */
  QUEUED: 'QUEUED',
  /** Server-confirmed. */
  SYNCED: 'SYNCED',
} as const

/** Connectivity states exposed to the UI. */
export const CONNECTION_STATUS = {
  ONLINE: 'ONLINE',
  /** Reachable-but-unreliable: probe failing while `navigator.onLine` is true. */
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
} as const

export type ConnectionStatus =
  (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS]

/**
 * Tunable defaults. Overridable in the page context via `NEXT_PUBLIC_OFFLINE_*`
 * (see `config.ts`); the service worker uses these values directly.
 */
export const OFFLINE_DEFAULTS = {
  /** Storage budget in MB when persistent storage was NOT granted. */
  CACHE_MAX_MB: 200,
  /** Storage budget in MB when persistent storage WAS granted. */
  CACHE_MAX_MB_PERSISTED: 500,
  /** How long a cached session may gate offline reads after token expiry. */
  GRACE_PERIOD_HOURS: 72,
  /** Hosted-video caching is opt-in — video is large. */
  ENABLE_VIDEO_CACHE: false,
  /** Outbox replay attempts before a row is marked FAILED. */
  SYNC_RETRY_MAX: 5,
  /** Network timeout before the API NetworkFirst strategy falls back to cache. */
  API_NETWORK_TIMEOUT_SECONDS: 4,
  /** Connectivity probe interval while online. */
  PROBE_INTERVAL_MS: 30_000,
  /** Consecutive probe failures before declaring DEGRADED. */
  PROBE_FAILURE_THRESHOLD: 3,
  /** Incremental sync cadence while online. */
  INCREMENTAL_SYNC_INTERVAL_MS: 5 * 60 * 1000,
  /** Evict media once usage crosses this fraction of budget. */
  EVICTION_HIGH_WATERMARK: 0.9,
  /** Warn the user once usage crosses this fraction of budget. */
  WARN_WATERMARK: 0.8,
} as const

/** localStorage keys owned by the offline subsystem. */
export const STORAGE_KEYS = {
  PERSISTENT_GRANTED: 'lh_storage_persistent',
  /** Cached runtime config for offline boot (plan 5.27). */
  RUNTIME_CONFIG: 'lh_offline_runtime_config',
  /** Last known user id, used to detect a user switch before the DB opens (S2). */
  LAST_USER_ID: 'lh_offline_last_user',
} as const

/** HTTP statuses that must never be retried — the server made a final decision. */
export const PERMANENT_FAILURE_STATUSES = [400, 401, 403, 404, 409, 410, 422]

/** HTTP statuses that are worth retrying later. */
export const RECOVERABLE_FAILURE_STATUSES = [408, 425, 429, 500, 502, 503, 504]
