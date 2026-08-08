/**
 * Conflict resolution.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THESE ARE BUSINESS DECISIONS, NOT TECHNICAL ONES.
 * Change them only with product sign-off.
 *
 *  1. Activity completion, `completed = true`  → CLIENT WINS.
 *     A learner who finished an activity offline genuinely finished it. The
 *     server has no basis to un-complete it.
 *
 *  2. Activity completion, `completed = false` → SERVER WINS.
 *     Un-completing is rare and usually an administrative correction, so we
 *     defer to the server rather than resurrect a local un-complete.
 *
 *  3. Assignment submission in DRAFT  → CLIENT WINS.
 *     The draft was authored offline; the server has no version of it.
 *
 *  4. Assignment submission already SUBMITTED server-side → TREAT AS DUPLICATE.
 *     Mark the queued row settled without resubmitting. This is the normal
 *     outcome when the response leg of a request was lost but the write landed.
 *
 *  5. Everything else → SERVER WINS, surface the conflict to the user.
 *     Silent data loss is never acceptable; the sync panel shows the failure.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { OutboxRecord } from './db'

export type ConflictOutcome =
  /** Local change stands; the row is settled. */
  | 'accept-client'
  /** Server state stands; discard our attempt but stop retrying. */
  | 'accept-server'
  /** Cannot be reconciled automatically; surface to the user. */
  | 'surface'

export interface ConflictResolution {
  outcome: ConflictOutcome
  /** Recorded on the outbox row and shown in the sync panel. */
  message: string
}

/** Parses a 409 body without throwing, so resolution never fails on bad JSON. */
async function readBody(response: Response): Promise<any> {
  try {
    const text = await response.text()
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

/**
 * Decides what happens to a queued mutation the server rejected with 409.
 *
 * `response` is consumed here; callers must not read its body again.
 */
export async function resolveConflict(
  row: OutboxRecord,
  response: Response
): Promise<ConflictResolution> {
  const body = await readBody(response)
  const serverDetail: string =
    body?.detail ?? body?.message ?? 'Server reported a conflict'

  // Rule 1 & 2 — activity completion.
  if (row.entity_type === 'trail') {
    const isCompletion =
      row.type === 'trail.complete_activity' ||
      row.url.indexOf('/add_activity/') !== -1

    if (isCompletion) {
      // Rule 1: the learner completed it. A 409 here means the server already
      // records completion, so our intent is satisfied either way.
      return {
        outcome: 'accept-server',
        message: 'Already marked complete on the server.',
      }
    }

    // Rule 2: un-complete defers to the server.
    return {
      outcome: 'accept-server',
      message: `Server state kept for this change. ${serverDetail}`,
    }
  }

  // Rules 3 & 4 — assignment submissions.
  if (row.entity_type === 'assignment_submission') {
    const alreadySubmitted =
      body?.already_submitted === true ||
      /already\s+submitted/i.test(String(serverDetail))

    if (alreadySubmitted) {
      // Rule 4: duplicate replay of a write that already landed.
      return {
        outcome: 'accept-server',
        message: 'Submission already recorded on the server.',
      }
    }

    // Rule 3: a draft authored offline has no server counterpart to lose to.
    return {
      outcome: 'surface',
      message: `Your submission could not be applied automatically. ${serverDetail}`,
    }
  }

  // Rule 5 — everything else defers to the server and is surfaced.
  return {
    outcome: 'surface',
    message: serverDetail,
  }
}
