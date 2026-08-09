/**
 * Conflict resolver tests (plan Layer 9.1).
 *
 * These encode business rules, so the assertions double as executable
 * documentation of what the product decided should win.
 */

import { resolveConflict } from '@/lib/offline/conflict-resolver'
import type { OutboxRecord } from '@/lib/offline/db'
import { OUTBOX_STATUS } from '@/lib/offline/constants'

function makeRow(overrides: Partial<OutboxRecord> = {}): OutboxRecord {
  return {
    id: 1,
    type: 'trail.complete_activity',
    entity_type: 'trail',
    url: 'https://api/x/api/v1/trail/add_activity/a1/',
    method: 'POST',
    body: null,
    headers: {},
    idempotency_key: 'key-1',
    status: OUTBOX_STATUS.PENDING,
    retry_count: 0,
    created_at: Date.now(),
    last_attempt_at: null,
    error_message: null,
    user_id: 1,
    ...overrides,
  }
}

function makeResponse(body: unknown): Response {
  return {
    status: 409,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

describe('activity completion conflicts', () => {
  it('settles a completion the server already recorded', async () => {
    const resolution = await resolveConflict(
      makeRow(),
      makeResponse({ detail: 'Already completed' })
    )

    // Rule 1: the learner completed it; a 409 means the server agrees.
    expect(resolution.outcome).toBe('accept-server')
    expect(resolution.message).toMatch(/already marked complete/i)
  })

  it('defers to the server when un-completing', async () => {
    const resolution = await resolveConflict(
      makeRow({
        type: 'trail.uncomplete_activity',
        url: 'https://api/x/api/v1/trail/remove_activity/a1/',
      }),
      makeResponse({ detail: 'Cannot uncomplete' })
    )

    // Rule 2: server wins for completed = false.
    expect(resolution.outcome).toBe('accept-server')
  })
})

describe('assignment submission conflicts', () => {
  it('treats an already-submitted response as a duplicate', async () => {
    const resolution = await resolveConflict(
      makeRow({
        entity_type: 'assignment_submission',
        type: 'assignment.submit',
      }),
      makeResponse({ already_submitted: true })
    )

    // Rule 4: the write landed; only the response was lost.
    expect(resolution.outcome).toBe('accept-server')
    expect(resolution.message).toMatch(/already recorded/i)
  })

  it('detects duplicates from the detail text too', async () => {
    const resolution = await resolveConflict(
      makeRow({ entity_type: 'assignment_submission' }),
      makeResponse({ detail: 'Submission already submitted for this task' })
    )

    expect(resolution.outcome).toBe('accept-server')
  })

  it('surfaces a genuine submission conflict rather than dropping work', async () => {
    const resolution = await resolveConflict(
      makeRow({ entity_type: 'assignment_submission' }),
      makeResponse({ detail: 'Assignment is closed' })
    )

    // Rule 3: never silently discard the learner's authored draft.
    expect(resolution.outcome).toBe('surface')
    expect(resolution.message).toContain('Assignment is closed')
  })
})

describe('fallback rule', () => {
  it('surfaces unknown conflicts with the server message', async () => {
    const resolution = await resolveConflict(
      makeRow({ entity_type: 'collection', type: 'collection.update' }),
      makeResponse({ detail: 'Version mismatch' })
    )

    expect(resolution.outcome).toBe('surface')
    expect(resolution.message).toBe('Version mismatch')
  })

  it('never throws on a malformed body', async () => {
    const badResponse = {
      status: 409,
      text: async () => 'not json at all',
    } as unknown as Response

    const resolution = await resolveConflict(makeRow(), badResponse)
    expect(resolution.outcome).toBeDefined()
    expect(typeof resolution.message).toBe('string')
  })
})
