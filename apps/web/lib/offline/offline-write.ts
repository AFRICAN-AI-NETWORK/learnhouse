/**
 * Seam B — the single write path for offline-aware mutations.
 *
 * BEHAVIOUR PRESERVATION is the central design constraint here.
 * Callers pass their *existing* request code as `perform`. When online — or when
 * the offline write flag is off — `offlineWrite` simply awaits `perform()` and
 * returns its value untouched. There is no new behaviour on the happy path, and
 * no existing call site changes its return shape.
 *
 * Offline behaviour is decided exclusively by the policy registry:
 *   - `queue` → durable outbox row, replayed verbatim on reconnect
 *   - `block` → refused with a user-facing reason, never enqueued (S5)
 */

import { shouldQueueWrites } from './connection'
import { getPolicy } from './policy'
import { isOfflineWriteEnabled } from './config'
import { enqueue } from './outbox'
import { requestOutboxSync } from './sync-trigger'

export type OfflineWriteOutcome<T> =
  /** Executed against the network; `result` is exactly what `perform` returned. */
  | { mode: 'online'; result: T }
  /** Persisted locally; will replay on reconnect. */
  | { mode: 'queued'; outboxId: number | null; idempotent: true }
  /** Refused offline; `reason` is safe to show the user. */
  | { mode: 'blocked'; reason: string }

export interface OfflineWriteParams<T> {
  /** Absolute endpoint, used for policy resolution and for replay. */
  url: string
  method: string
  /** Payload to persist for replay. Omit for bodyless verbs. */
  body?: any
  /** Domain grouping that preserves replay ordering, e.g. `trail`. */
  entityType: string
  /** Operation label for the sync UI, e.g. `trail.complete_activity`. */
  type: string
  /** Owning user, for cross-user isolation of queued rows. */
  userId: number | null
  /** The caller's existing online request. Invoked unchanged when online. */
  perform: () => Promise<T>
}

/**
 * Routes a mutation through the network or the outbox.
 *
 * Note the deliberate ordering: connectivity is checked *before* policy, so an
 * online request never pays the cost of policy resolution and can never be
 * blocked by an offline rule.
 */
export async function offlineWrite<T>(
  params: OfflineWriteParams<T>
): Promise<OfflineWriteOutcome<T>> {
  // Online, or the feature is dark: behave exactly as the app does today.
  if (!shouldQueueWrites() || !isOfflineWriteEnabled()) {
    return { mode: 'online', result: await params.perform() }
  }

  const policy = getPolicy(params.url, params.method)

  if (policy.write === 'block') {
    return {
      mode: 'blocked',
      reason: policy.reason ?? 'This action requires an internet connection.',
    }
  }

  const outboxId = await enqueue({
    type: params.type,
    entityType: params.entityType,
    url: params.url,
    method: params.method,
    body: params.body,
    userId: params.userId,
  })

  // Ask the service worker to drain as soon as connectivity returns.
  void requestOutboxSync()

  return { mode: 'queued', outboxId, idempotent: true }
}

/** Narrowing helper for call sites that only care whether the write landed locally. */
export function isQueued<T>(
  outcome: OfflineWriteOutcome<T>
): outcome is { mode: 'queued'; outboxId: number | null; idempotent: true } {
  return outcome.mode === 'queued'
}

/** Narrowing helper for blocked writes. */
export function isBlocked<T>(
  outcome: OfflineWriteOutcome<T>
): outcome is { mode: 'blocked'; reason: string } {
  return outcome.mode === 'blocked'
}

/**
 * Convenience for the common call shape: return the online result when online,
 * or `null` when the write was queued or blocked. Lets a call site adopt the seam
 * without restructuring its control flow.
 */
export async function offlineWriteOrNull<T>(
  params: OfflineWriteParams<T>
): Promise<T | null> {
  const outcome = await offlineWrite(params)
  return outcome.mode === 'online' ? outcome.result : null
}
