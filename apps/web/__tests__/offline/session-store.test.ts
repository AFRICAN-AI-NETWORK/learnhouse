/**
 * Session store tests (plan Layer 9.1).
 *
 * The critical case is S2 / T6: cross-user data isolation on a shared device,
 * including the common path where the previous user closed the tab instead of
 * logging out.
 */

import 'fake-indexeddb/auto'
import { openDb, clearAllTables } from '@/lib/offline/db'
import {
  saveOfflineSession,
  getOfflineSession,
  isOfflineAuthValid,
  clearOfflineSession,
  enforceSessionOwner,
  getOfflineUserId,
} from '@/lib/offline/session-store'
import { STORAGE_KEYS } from '@/lib/offline/constants'

const HOUR = 60 * 60 * 1000

beforeEach(async () => {
  await clearAllTables()
  window.localStorage.clear()
})

async function seedUser(userId: number, tokenExpiry: number) {
  await saveOfflineSession({
    userId,
    username: `user${userId}`,
    userMetadata: { id: userId, name: `User ${userId}` },
    roles: [{ role: 'MEMBER' }],
    tokenExpiry,
  })
}

describe('saveOfflineSession / getOfflineSession', () => {
  it('stores exactly one session row', async () => {
    await seedUser(1, Date.now() + HOUR)
    await seedUser(1, Date.now() + 2 * HOUR)

    const db = await openDb()
    expect(await db!.sessions.count()).toBe(1)
  })

  it('classifies an unexpired token as valid', async () => {
    await seedUser(1, Date.now() + HOUR)
    const state = await getOfflineSession()

    expect(state.valid).toBe(true)
    expect(state.grace).toBe(false)
    expect(await isOfflineAuthValid()).toBe(true)
  })

  it('classifies a recently expired token as in-grace', async () => {
    await seedUser(1, Date.now() - HOUR)
    const state = await getOfflineSession()

    expect(state.valid).toBe(false)
    expect(state.grace).toBe(true)
    expect(await isOfflineAuthValid()).toBe(true)
  })

  /**
   * Regression: the NextAuth JWT callback only stamps `tokens.expiry` after its
   * first refresh, so a freshly logged-in session has none. Treating that as
   * "expired" showed "Your session has expired" to users who had just signed in.
   */
  it('treats an unknown expiry as valid, not expired', async () => {
    await saveOfflineSession({
      userId: 1,
      username: 'user1',
      userMetadata: { id: 1 },
      roles: [],
      tokenExpiry: 0, // what the provider reads before the first refresh
    })

    const state = await getOfflineSession()

    expect(state.valid).toBe(true)
    expect(state.grace).toBe(false)
  })

  it('rejects a session past the grace window', async () => {
    // Grace defaults to 72h and is anchored to token expiry, so an expiry far in
    // the past puts grace_until in the past too.
    await seedUser(1, Date.now() - 200 * HOUR)
    const state = await getOfflineSession()

    expect(state.valid).toBe(false)
    expect(state.grace).toBe(false)
    expect(await isOfflineAuthValid()).toBe(false)
  })

  /**
   * Risk 5 — clock skew. Grace is anchored to the server-issued token expiry, not
   * to "now at save time", so winding the device clock forward cannot manufacture
   * additional grace beyond that anchor.
   */
  it('anchors grace to token expiry rather than save time', async () => {
    const expiry = Date.now() + HOUR
    await seedUser(1, expiry)

    const db = await openDb()
    const [row] = await db!.sessions.toArray()

    // 72h default window measured from expiry.
    expect(row.grace_until).toBe(expiry + 72 * HOUR)
  })

  it('stores no token material', async () => {
    await seedUser(1, Date.now() + HOUR)
    const db = await openDb()
    const [row] = await db!.sessions.toArray()

    const serialised = JSON.stringify(row)
    expect(serialised).not.toContain('access_token')
    expect(serialised).not.toContain('Bearer')
  })
})

describe('S2 — cross-user isolation', () => {
  it('wipes all data when a different user authenticates', async () => {
    await seedUser(1, Date.now() + HOUR)

    const db = await openDb()
    await db!.courses.put({
      id: 99,
      course_uuid: 'course_secret',
      org_id: 1,
      data: { name: "User 1's course" },
      cached_at: Date.now(),
    })

    const wiped = await enforceSessionOwner(2)

    expect(wiped).toBe(true)
    expect(await db!.courses.count()).toBe(0)
    expect(await db!.sessions.count()).toBe(0)
  })

  it('does not wipe when the same user re-authenticates', async () => {
    await seedUser(1, Date.now() + HOUR)

    const db = await openDb()
    await db!.courses.put({
      id: 1,
      course_uuid: 'c1',
      org_id: 1,
      data: { name: 'Kept' },
      cached_at: Date.now(),
    })

    const wiped = await enforceSessionOwner(1)

    expect(wiped).toBe(false)
    expect(await db!.courses.count()).toBe(1)
  })

  /**
   * The gap the original plan left open: User A never logs out, they just close
   * the tab. localStorage is gone (or was never written), but a foreign session
   * row remains in IndexedDB — it must still trigger a wipe.
   */
  it('wipes when a foreign session row exists without a localStorage marker', async () => {
    await seedUser(1, Date.now() + HOUR)

    const db = await openDb()
    await db!.courses.put({
      id: 5,
      course_uuid: 'c5',
      org_id: 1,
      data: { name: 'Leftover' },
      cached_at: Date.now(),
    })

    // Simulate the marker being unavailable.
    window.localStorage.removeItem(STORAGE_KEYS.LAST_USER_ID)

    const wiped = await enforceSessionOwner(2)

    expect(wiped).toBe(true)
    expect(await db!.courses.count()).toBe(0)
  })
})

describe('clearOfflineSession', () => {
  it('removes the session and all cached data', async () => {
    await seedUser(1, Date.now() + HOUR)

    const db = await openDb()
    await db!.courses.put({
      id: 1,
      course_uuid: 'c1',
      org_id: 1,
      data: {},
      cached_at: Date.now(),
    })

    await clearOfflineSession()

    expect(await db!.sessions.count()).toBe(0)
    expect(await db!.courses.count()).toBe(0)
    expect(await getOfflineUserId()).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEYS.LAST_USER_ID)).toBeNull()
  })
})
