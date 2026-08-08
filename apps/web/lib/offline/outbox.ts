/**
 * The outbox — durable queue for mutations made while offline.
 *
 * SECURITY (S3): rows never store an `Authorization` header or any cookie. The
 * caller's token is injected at replay time from the live session, so a revoked
 * credential cannot be replayed and no secret sits at rest in a structure whose
 * entire purpose is to be replayed later.
 *
 * ORDERING: drain is sequential *within* an entity type, because the backend has
 * real ordering constraints (a trail step cannot complete before the activity it
 * depends on). Different entity types are independent and drain in sequence too,
 * which keeps the implementation simple and the failure modes obvious.
 */

import { openDb, reportOfflineError } from './db'
import type { OutboxRecord } from './db'
import {
  OUTBOX_STATUS,
  PERMANENT_FAILURE_STATUSES,
  type OutboxStatus,
} from './constants'
import { getSyncRetryMax } from './config'

/** Headers that must never be persisted with a queued request (S3). */
const FORBIDDEN_HEADERS = ['authorization', 'cookie', 'set-cookie']

function stripForbiddenHeaders(
  headers: Record<string, string> | undefined
): Record<string, string> {
  const safe: Record<string, string> = {}
  if (!headers) return safe
  Object.keys(headers).forEach((key) => {
    if (FORBIDDEN_HEADERS.indexOf(key.toLowerCase()) === -1) {
      safe[key] = headers[key]
    }
  })
  return safe
}

/** RFC4122-ish v4 id. Uses `crypto.randomUUID` when available. */
export function createIdempotencyKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as any).randomUUID === 'function'
  ) {
    return (crypto as any).randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export interface EnqueueParams {
  type: string
  entityType: string
  url: string
  method: string
  body?: any
  headers?: Record<string, string>
  userId: number | null
}

/** Appends a mutation to the queue. Returns the row id, or null if unavailable. */
export async function enqueue(params: EnqueueParams): Promise<number | null> {
  const db = await openDb()
  if (!db) return null

  const record: OutboxRecord = {
    type: params.type,
    entity_type: params.entityType,
    url: params.url,
    method: params.method.toUpperCase(),
    body:
      params.body === undefined || params.body === null
        ? null
        : JSON.stringify(params.body),
    headers: stripForbiddenHeaders({
      'Content-Type': 'application/json',
      ...(params.headers ?? {}),
    }),
    idempotency_key: createIdempotencyKey(),
    status: OUTBOX_STATUS.PENDING,
    retry_count: 0,
    created_at: Date.now(),
    last_attempt_at: null,
    error_message: null,
    user_id: params.userId,
  }

  try {
    const id = await db.outbox.add(record)
    return typeof id === 'number' ? id : null
  } catch (error) {
    reportOfflineError('outbox_enqueue_failed', error)
    return null
  }
}

/** Rows awaiting replay, oldest first, grouped-friendly by entity type. */
export async function getReplayableRows(): Promise<OutboxRecord[]> {
  const db = await openDb()
  if (!db) return []

  try {
    const rows = await db.outbox
      .where('status')
      .anyOf(OUTBOX_STATUS.PENDING, OUTBOX_STATUS.RETRYING)
      .toArray()

    // Stable ordering: entity type, then creation time.
    return rows.sort((a, b) => {
      if (a.entity_type === b.entity_type) return a.created_at - b.created_at
      return a.entity_type < b.entity_type ? -1 : 1
    })
  } catch (error) {
    reportOfflineError('outbox_read_failed', error)
    return []
  }
}

export interface OutboxCounts {
  pending: number
  retrying: number
  failed: number
  synced: number
  total: number
}

/** Counts by status, for the sync status indicator. */
export async function getCounts(): Promise<OutboxCounts> {
  const empty: OutboxCounts = {
    pending: 0,
    retrying: 0,
    failed: 0,
    synced: 0,
    total: 0,
  }

  const db = await openDb()
  if (!db) return empty

  try {
    const rows = await db.outbox.toArray()
    const counts = { ...empty, total: rows.length }
    rows.forEach((row) => {
      if (row.status === OUTBOX_STATUS.PENDING) counts.pending++
      else if (row.status === OUTBOX_STATUS.RETRYING) counts.retrying++
      else if (row.status === OUTBOX_STATUS.FAILED) counts.failed++
      else if (row.status === OUTBOX_STATUS.SYNCED) counts.synced++
    })
    return counts
  } catch (error) {
    reportOfflineError('outbox_count_failed', error)
    return empty
  }
}

async function updateRow(
  id: number,
  changes: Partial<OutboxRecord>
): Promise<void> {
  const db = await openDb()
  if (!db) return
  try {
    await db.outbox.update(id, changes)
  } catch (error) {
    reportOfflineError('outbox_update_failed', error)
  }
}

export async function markSynced(id: number): Promise<void> {
  await updateRow(id, {
    status: OUTBOX_STATUS.SYNCED,
    last_attempt_at: Date.now(),
    error_message: null,
  })
}

export async function markFailed(id: number, message: string): Promise<void> {
  await updateRow(id, {
    status: OUTBOX_STATUS.FAILED,
    last_attempt_at: Date.now(),
    error_message: message,
  })
}

/**
 * Records a recoverable failure, escalating to FAILED once the retry budget is
 * exhausted so the UI can surface it instead of retrying forever.
 */
export async function markRetry(
  row: OutboxRecord,
  message: string
): Promise<OutboxStatus> {
  const nextCount = row.retry_count + 1
  const exhausted = nextCount >= getSyncRetryMax()
  const status = exhausted ? OUTBOX_STATUS.FAILED : OUTBOX_STATUS.RETRYING

  if (row.id !== undefined) {
    await updateRow(row.id, {
      status,
      retry_count: nextCount,
      last_attempt_at: Date.now(),
      error_message: message,
    })
  }

  return status
}

/** Re-queues a failed row at the user's request. */
export async function retryRow(id: number): Promise<void> {
  await updateRow(id, {
    status: OUTBOX_STATUS.PENDING,
    retry_count: 0,
    error_message: null,
  })
}

/** Terminal acknowledgement — stops UI alerting without replaying. */
export async function dismissRow(id: number): Promise<void> {
  await updateRow(id, { status: OUTBOX_STATUS.FAILED_DISMISSED })
}

/** True when an HTTP status means "do not retry, the server decided". */
export function isPermanentFailure(status: number): boolean {
  return PERMANENT_FAILURE_STATUSES.indexOf(status) !== -1
}

/** Removes synced rows older than the retention window to bound growth. */
export async function pruneSynced(
  olderThanMs: number = 24 * 60 * 60 * 1000
): Promise<number> {
  const db = await openDb()
  if (!db) return 0

  const cutoff = Date.now() - olderThanMs
  try {
    return await db.outbox
      .where('status')
      .equals(OUTBOX_STATUS.SYNCED)
      .filter((row) => (row.last_attempt_at ?? row.created_at) < cutoff)
      .delete()
  } catch (error) {
    reportOfflineError('outbox_prune_failed', error)
    return 0
  }
}
