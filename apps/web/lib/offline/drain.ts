/**
 * Page-context outbox drain (plan Layer 4.1 `drainOutbox`).
 *
 * Mirrors the service worker's replay logic for browsers without Background Sync
 * (iOS Safari, Firefox desktop). Both paths operate on the same outbox table and
 * share the same status semantics, so recovery behaviour is identical either way.
 *
 * SECURITY (S3): the access token is injected here, at replay time, from the
 * live session — never read from the queued row. A revoked token therefore fails
 * with 401 and the row is marked FAILED rather than silently replaying with
 * stale credentials.
 */

import {
  getReplayableRows,
  markSynced,
  markFailed,
  markRetry,
  isPermanentFailure,
  pruneSynced,
} from './outbox'
import type { OutboxRecord } from './db'
import { reportOfflineError } from './db'
import { OUTBOX_STATUS } from './constants'
import { resolveConflict } from './conflict-resolver'

export interface DrainResult {
  synced: number
  failed: number
  remaining: number
  skipped: boolean
}

/** Supplies the current bearer token. Set once by the provider at boot. */
type TokenProvider = () => string | null | undefined

let tokenProvider: TokenProvider = () => null

/**
 * Registers the token source used for replay.
 * The provider is called per request so a refreshed token is picked up mid-drain.
 */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

let draining = false

/**
 * Replays every queued mutation.
 *
 * Guarded against re-entry: a second call while a drain is in flight resolves
 * immediately with `skipped`, so an `online` event plus a manual retry cannot
 * double-send the same row.
 */
export async function drainOutbox(): Promise<DrainResult> {
  if (draining) {
    return { synced: 0, failed: 0, remaining: 0, skipped: true }
  }

  draining = true
  let synced = 0
  let failed = 0

  try {
    const rows = await getReplayableRows()

    // Sequential on purpose: the backend has ordering constraints within an
    // entity type, and parallel replay would race them.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row.id === undefined) continue

      const outcome = await replayRow(row)
      if (outcome === 'synced') synced++
      else if (outcome === 'failed') failed++
    }

    const remainingRows = await getReplayableRows()

    // Keep the table bounded; synced rows are only kept for the status UI.
    await pruneSynced()

    return { synced, failed, remaining: remainingRows.length, skipped: false }
  } catch (error) {
    reportOfflineError('drain_failed', error)
    return { synced, failed, remaining: 0, skipped: false }
  } finally {
    draining = false
  }
}

type ReplayOutcome = 'synced' | 'failed' | 'retry'

async function replayRow(row: OutboxRecord): Promise<ReplayOutcome> {
  const token = tokenProvider()

  const headers: Record<string, string> = {
    ...row.headers,
    'X-Idempotency-Key': row.idempotency_key,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(row.url, {
      method: row.method,
      headers,
      body: row.body ?? undefined,
      credentials: 'include',
      redirect: 'follow',
    })

    if (response.ok) {
      await markSynced(row.id as number)
      return 'synced'
    }

    // 409 means the server has a competing version — the resolver applies the
    // documented business rules rather than deciding here.
    if (response.status === 409) {
      const resolution = await resolveConflict(row, response)

      switch (resolution.outcome) {
        case 'accept-server':
          // Our intent is already satisfied (or deliberately superseded).
          // Settle the row so we stop retrying a decided outcome.
          await markSynced(row.id as number)
          return 'synced'

        case 'accept-client':
          // The local change should stand, but the server refused it and offers no
          // force path. Surfacing is the only honest option — silently dropping
          // the user's work would be data loss.
          await markFailed(row.id as number, resolution.message)
          return 'failed'

        case 'surface':
        default:
          await markFailed(row.id as number, resolution.message)
          return 'failed'
      }
    }

    const detail = await safeReadError(response)

    if (isPermanentFailure(response.status)) {
      await markFailed(row.id as number, `${response.status}: ${detail}`)
      return 'failed'
    }

    const status = await markRetry(row, `${response.status}: ${detail}`)
    return status === OUTBOX_STATUS.FAILED ? 'failed' : 'retry'
  } catch (error) {
    // Network error: still offline, or the request died in flight. Retriable.
    const message = error instanceof Error ? error.message : 'Network error'
    const status = await markRetry(row, message)
    return status === OUTBOX_STATUS.FAILED ? 'failed' : 'retry'
  }
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return response.statusText
    try {
      const json = JSON.parse(text)
      return json?.detail ?? json?.message ?? text.slice(0, 200)
    } catch {
      return text.slice(0, 200)
    }
  } catch {
    return response.statusText
  }
}
