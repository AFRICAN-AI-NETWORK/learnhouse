/**
 * Outbox tests (plan Layer 9.1).
 *
 * Runs against a real (in-memory) IndexedDB via `fake-indexeddb`, so Dexie's
 * indexes and transactions are genuinely exercised rather than mocked away.
 */

import 'fake-indexeddb/auto'
import { openDb, clearAllTables } from '@/lib/offline/db'
import {
  enqueue,
  getReplayableRows,
  getCounts,
  markSynced,
  markFailed,
  markRetry,
  retryRow,
  dismissRow,
  isPermanentFailure,
  pruneSynced,
  createIdempotencyKey,
} from '@/lib/offline/outbox'
import { OUTBOX_STATUS } from '@/lib/offline/constants'

beforeEach(async () => {
  await clearAllTables()
})

describe('createIdempotencyKey', () => {
  it('produces unique, non-empty keys', () => {
    const keys = new Set(
      Array.from({ length: 100 }, () => createIdempotencyKey())
    )
    expect(keys.size).toBe(100)
    keys.forEach((key) => expect(key.length).toBeGreaterThan(10))
  })
})

describe('enqueue', () => {
  it('persists a replayable row with an idempotency key', async () => {
    const id = await enqueue({
      type: 'trail.complete_activity',
      entityType: 'trail',
      url: 'https://api/x/api/v1/trail/add_activity/a1/',
      method: 'POST',
      body: { foo: 'bar' },
      userId: 7,
    })

    expect(id).not.toBeNull()

    const rows = await getReplayableRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe(OUTBOX_STATUS.PENDING)
    expect(rows[0].idempotency_key).toBeTruthy()
    expect(rows[0].body).toBe(JSON.stringify({ foo: 'bar' }))
    expect(rows[0].user_id).toBe(7)
  })

  /**
   * S3 — the security property that matters most here. A queued row is a
   * replayable request; if it carried a bearer token, that token would sit at rest
   * and could be replayed after revocation.
   */
  it('never stores Authorization or Cookie headers', async () => {
    await enqueue({
      type: 'trail.complete_activity',
      entityType: 'trail',
      url: 'https://api/x/api/v1/trail/add_activity/a1/',
      method: 'POST',
      headers: {
        Authorization: 'Bearer super-secret-token',
        Cookie: 'session=abc',
        'X-Safe-Header': 'kept',
      },
      userId: 1,
    })

    const [row] = await getReplayableRows()
    const headerKeys = Object.keys(row.headers).map((key) => key.toLowerCase())

    expect(headerKeys).not.toContain('authorization')
    expect(headerKeys).not.toContain('cookie')
    expect(row.headers['X-Safe-Header']).toBe('kept')

    // Belt and braces: the serialised row must not contain the token anywhere.
    expect(JSON.stringify(row)).not.toContain('super-secret-token')
  })
})

describe('replay ordering', () => {
  it('orders rows by entity type then creation time', async () => {
    await enqueue({
      type: 'b',
      entityType: 'zeta',
      url: 'u',
      method: 'POST',
      userId: 1,
    })
    await enqueue({
      type: 'a',
      entityType: 'alpha',
      url: 'u',
      method: 'POST',
      userId: 1,
    })

    const rows = await getReplayableRows()
    expect(rows.map((row) => row.entity_type)).toEqual(['alpha', 'zeta'])
  })
})

describe('status transitions', () => {
  it('marks a row synced', async () => {
    const id = (await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })) as number

    await markSynced(id)

    const counts = await getCounts()
    expect(counts.synced).toBe(1)
    expect(await getReplayableRows()).toHaveLength(0)
  })

  it('marks a row failed with a message', async () => {
    const id = (await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })) as number

    await markFailed(id, '403: forbidden')

    const counts = await getCounts()
    expect(counts.failed).toBe(1)

    const db = await openDb()
    const row = await db!.outbox.get(id)
    expect(row?.error_message).toBe('403: forbidden')
  })

  it('escalates to FAILED once the retry budget is exhausted', async () => {
    await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })
    let [row] = await getReplayableRows()

    // Default budget is 5 attempts.
    for (let attempt = 1; attempt <= 4; attempt++) {
      const status = await markRetry(row, 'network')
      expect(status).toBe(OUTBOX_STATUS.RETRYING)
      ;[row] = await getReplayableRows()
    }

    const finalStatus = await markRetry(row, 'network')
    expect(finalStatus).toBe(OUTBOX_STATUS.FAILED)
    expect((await getCounts()).failed).toBe(1)
  })

  it('requeues a failed row on retry', async () => {
    const id = (await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })) as number

    await markFailed(id, 'boom')
    await retryRow(id)

    const rows = await getReplayableRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe(OUTBOX_STATUS.PENDING)
    expect(rows[0].retry_count).toBe(0)
  })

  it('dismissal is terminal and stops replay', async () => {
    const id = (await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })) as number

    await markFailed(id, 'boom')
    await dismissRow(id)

    expect(await getReplayableRows()).toHaveLength(0)
    const counts = await getCounts()
    expect(counts.failed).toBe(0)
  })
})

describe('isPermanentFailure', () => {
  it('treats client errors as permanent and server errors as retriable', () => {
    ;[400, 401, 403, 404, 409, 422].forEach((status) =>
      expect(isPermanentFailure(status)).toBe(true)
    )
    ;[429, 500, 502, 503, 504].forEach((status) =>
      expect(isPermanentFailure(status)).toBe(false)
    )
  })
})

describe('pruneSynced', () => {
  it('removes only old synced rows', async () => {
    const id = (await enqueue({
      type: 't',
      entityType: 'trail',
      url: 'u',
      method: 'POST',
      userId: 1,
    })) as number
    await markSynced(id)

    // Nothing is old enough yet.
    expect(await pruneSynced()).toBe(0)

    // Age the row past the retention window.
    const db = await openDb()
    await db!.outbox.update(id, {
      last_attempt_at: Date.now() - 48 * 60 * 60 * 1000,
    })

    expect(await pruneSynced()).toBe(1)
    expect((await getCounts()).total).toBe(0)
  })
})
