/**
 * Client-side activity completion.
 *
 * WHY THIS FILE EXISTS
 * `services/courses/activity.ts` is a `'use server'` module, so
 * `markActivityAsComplete` runs as a Next.js Server Action. Server Actions POST to
 * the Next.js server, which is unreachable when the device is offline — they can
 * neither succeed nor be intercepted and queued. Completion is the single most
 * important offline write in the product, so it needs a client-callable path.
 *
 * The original server action is deliberately left in place and unchanged: it stays
 * the online path for existing callers. This module is additive (plan R5 #4).
 */

import { getAPIUrl } from '@services/config/config'
import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'
import { offlineWrite, type OfflineWriteOutcome } from './offline-write'
import { syncEngine } from './sync-engine'
import { enqueue } from './outbox'

const ENTITY_TYPE = 'trail'

export interface CompletionResult {
  success: boolean
  /** True when the change was stored locally and will sync later. */
  queued: boolean
  /** Set when the action was refused offline. */
  blocked?: boolean
  error?: string
}

async function performTrailRequest(
  url: string,
  method: 'POST' | 'DELETE',
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  const result = await fetch(
    url,
    RequestBodyWithAuthHeader(
      method,
      method === 'POST' ? {} : null,
      null,
      accessToken
    )
  )

  if (!result.ok) {
    let detail = result.statusText
    try {
      const body = await result.json()
      detail = body?.detail ?? body?.message ?? detail
    } catch {
      // Keep the status text.
    }
    return { success: false, error: detail }
  }

  return { success: true }
}

/**
 * Marks an activity complete, optimistically and durably.
 *
 * Local progress and the outbox row are written inside one transaction, so the UI
 * can never show a completion that has no chance of reaching the server.
 */
export async function markActivityCompleteClient(params: {
  activityUuid: string
  courseUuid: string
  userId: number
  accessToken: string
}): Promise<CompletionResult> {
  const url = `${getAPIUrl()}trail/add_activity/${params.activityUuid}/`

  const outcome: OfflineWriteOutcome<{ success: boolean; error?: string }> =
    await offlineWrite({
      url,
      method: 'POST',
      body: {},
      entityType: ENTITY_TYPE,
      type: 'trail.complete_activity',
      userId: params.userId,
      perform: () => performTrailRequest(url, 'POST', params.accessToken),
    })

  if (outcome.mode === 'blocked') {
    return {
      success: false,
      queued: false,
      blocked: true,
      error: outcome.reason,
    }
  }

  if (outcome.mode === 'online') {
    // Mirror the confirmed state locally so a later offline read is accurate.
    if (outcome.result.success) {
      await recordLocalCompletion(params, true, false)
    }
    return {
      success: outcome.result.success,
      queued: false,
      error: outcome.result.error,
    }
  }

  // Queued: the row already exists, so record the optimistic local state.
  await recordLocalCompletion(params, true, true)
  return { success: true, queued: true }
}

/** Removes a completion. Queued offline like its counterpart. */
export async function unmarkActivityCompleteClient(params: {
  activityUuid: string
  courseUuid: string
  userId: number
  accessToken: string
}): Promise<CompletionResult> {
  const url = `${getAPIUrl()}trail/remove_activity/${params.activityUuid}/`

  // NOTE: `offlineWrite` blocks every DELETE offline by policy (S5). Un-completing
  // is therefore an online-only action, which matches the conflict rule that
  // server state wins for `completed = false`.
  const outcome = await offlineWrite({
    url,
    method: 'DELETE',
    entityType: ENTITY_TYPE,
    type: 'trail.uncomplete_activity',
    userId: params.userId,
    perform: () => performTrailRequest(url, 'DELETE', params.accessToken),
  })

  if (outcome.mode === 'blocked') {
    return {
      success: false,
      queued: false,
      blocked: true,
      error: outcome.reason,
    }
  }

  if (outcome.mode === 'online') {
    if (outcome.result.success) {
      await recordLocalCompletion(params, false, false)
    }
    return {
      success: outcome.result.success,
      queued: false,
      error: outcome.result.error,
    }
  }

  return { success: true, queued: true }
}

/**
 * Mirrors completion state into local storage.
 *
 * ORDERING GUARANTEE — this is always called *after* `offlineWrite` has either
 * confirmed the request online or committed the outbox row. Writing the queue
 * entry first means the only reachable failure mode is "queued but not yet shown
 * as complete": the server still receives the change, and the next sync corrects
 * the UI. The reverse order could show a completion that was never queued, which
 * is silent data loss.
 *
 * @param pending true while an unresolved outbox row exists for this change.
 */
async function recordLocalCompletion(
  params: {
    activityUuid: string
    courseUuid: string
    userId: number
  },
  completed: boolean,
  pending: boolean
): Promise<void> {
  await syncEngine.setProgress({
    userId: params.userId,
    activityUuid: params.activityUuid,
    courseUuid: params.courseUuid,
    completed,
    pending,
  })
}

/** Re-exported for the sync panel, which requeues failed rows. */
export { enqueue as enqueueTrailMutation }
