/**
 * Offline observability.
 *
 * Two distinct concerns, deliberately kept in one module so instrumentation is
 * declared once rather than scattered:
 *
 *  - ERRORS → Sentry, tagged `offline: true` so an alert can target offline
 *    failures without drowning in unrelated noise (11.1/11.2).
 *  - USAGE  → Umami, answering the business question the rollout exists to
 *    answer: are learners actually using offline mode, and completing content
 *    while they do (11.4)?
 *
 * PRIVACY: events carry counts, durations and operation types only. Never user
 * identifiers, course names, or free text — an analytics pipeline is not an
 * appropriate destination for learner data.
 *
 * Both sinks are optional. If Sentry or Umami is absent, calls are inert rather
 * than throwing, so instrumentation can never break a user flow.
 */

export type OfflineEvent =
  | 'offline_session_start'
  | 'offline_session_end'
  | 'offline_content_viewed'
  | 'offline_sync_completed'
  | 'offline_sync_failed'
  | 'offline_course_downloaded'
  | 'offline_storage_evicted'

type EventPayload = Record<string, string | number | boolean>

interface UmamiGlobal {
  track: (event: string, data?: EventPayload) => void
}

interface SentryGlobal {
  captureException: (error: unknown, context?: Record<string, unknown>) => void
  captureMessage: (message: string, context?: Record<string, unknown>) => void
}

function getUmami(): UmamiGlobal | null {
  if (typeof window === 'undefined') return null
  const umami = (window as any).umami
  return umami && typeof umami.track === 'function' ? umami : null
}

function getSentry(): SentryGlobal | null {
  if (typeof window === 'undefined') return null
  const sentry = (window as any).Sentry
  return sentry && typeof sentry.captureException === 'function' ? sentry : null
}

/**
 * Records an offline usage event.
 *
 * Fire-and-forget by design: analytics must never delay or fail the action it is
 * measuring.
 */
export function trackOfflineEvent(
  event: OfflineEvent,
  payload: EventPayload = {}
): void {
  const umami = getUmami()
  if (!umami) return

  try {
    umami.track(event, payload)
  } catch {
    // A failing analytics call is not worth surfacing.
  }
}

/**
 * Reports an offline-path error to Sentry with consistent tagging.
 *
 * `context` identifies the code path (e.g. `outbox_enqueue_failed`) so alerts can
 * be scoped narrowly instead of firing on every offline error.
 */
export function reportOfflineError(
  context: string,
  error: unknown,
  extra: Record<string, unknown> = {}
): void {
  const sentry = getSentry()

  if (sentry) {
    try {
      sentry.captureException(error, {
        tags: { offline: true, offline_context: context },
        extra,
      })
      return
    } catch {
      // Fall through to the console.
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(`[offline:${context}]`, error, extra)
  }
}

/**
 * Reports an outbox entry that exhausted its retries (plan 11.2).
 *
 * This is the signal that matters operationally: a spike across users means an API
 * regression, not a set of unlucky individuals. Sent as a message rather than an
 * exception because it is an expected-but-notable outcome, not a crash.
 */
export function reportOutboxFailure(params: {
  operationType: string
  entityType: string
  httpStatus?: number
  errorMessage: string
  retryCount: number
}): void {
  const sentry = getSentry()
  if (!sentry || typeof sentry.captureMessage !== 'function') return

  try {
    sentry.captureMessage(`Offline sync failed: ${params.operationType}`, {
      level: 'warning',
      tags: {
        offline: true,
        offline_context: 'outbox_failure',
        operation_type: params.operationType,
        entity_type: params.entityType,
      },
      extra: {
        http_status: params.httpStatus,
        // Server-provided text only — never the request body, which could
        // contain learner work.
        error_message: params.errorMessage,
        retry_count: params.retryCount,
      },
    })
  } catch {
    // Non-fatal.
  }

  trackOfflineEvent('offline_sync_failed', {
    operation_type: params.operationType,
    entity_type: params.entityType,
  })
}

/**
 * Tracks how long a user spent offline.
 *
 * Kept module-local rather than persisted: a duration that spans a browser
 * restart is not meaningful, and persisting it would add storage for no insight.
 */
let offlineSince: number | null = null

export function markOfflineStart(): void {
  if (offlineSince !== null) return
  offlineSince = Date.now()
  trackOfflineEvent('offline_session_start')
}

export function markOfflineEnd(): void {
  if (offlineSince === null) return

  const durationSeconds = Math.round((Date.now() - offlineSince) / 1000)
  offlineSince = null

  trackOfflineEvent('offline_session_end', {
    duration_seconds: durationSeconds,
  })
}

/** Records a completed outbox drain. */
export function trackSyncCompleted(params: {
  synced: number
  failed: number
  durationMs: number
}): void {
  trackOfflineEvent('offline_sync_completed', {
    synced: params.synced,
    failed: params.failed,
    duration_ms: params.durationMs,
  })
}

/** Records that cached content was read while offline. */
export function trackOfflineContentViewed(contentType: string): void {
  trackOfflineEvent('offline_content_viewed', { content_type: contentType })
}

/** Records a completed course download. */
export function trackCourseDownloaded(params: {
  activities: number
  mediaCached: number
  mediaFailed: number
}): void {
  trackOfflineEvent('offline_course_downloaded', {
    activities: params.activities,
    media_cached: params.mediaCached,
    media_failed: params.mediaFailed,
  })
}

/** Records an LRU eviction sweep, so storage pressure is visible in aggregate. */
export function trackStorageEvicted(assetsEvicted: number): void {
  trackOfflineEvent('offline_storage_evicted', {
    assets_evicted: assetsEvicted,
  })
}
