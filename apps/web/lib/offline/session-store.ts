/**
 * Offline session store.
 *
 * SECURITY POSTURE — read before changing anything here:
 *
 * The backend issues the access token in a cookie with `httponly=False`
 * (`apps/api/src/routers/auth.py`), so the token is already readable by any
 * script on the origin. Encrypting a copy of it inside IndexedDB would therefore
 * be theatre, not a control: the device owner holds the key either way.
 *
 * So this module deliberately stores **no secrets**. It persists only the
 * non-sensitive session metadata needed to render the shell and gate the UI
 * while offline (user id, display metadata, role snapshot, expiry timestamps).
 * Tokens are read from the live NextAuth session when online, and injected into
 * outbox replays at drain time (S3).
 */

import { openDb, clearAllTables, reportOfflineError } from './db'
import type { SessionRecord } from './db'
import { purgeAllAppCaches } from './storage-policy'
import { getGracePeriodHours } from './config'
import { STORAGE_KEYS } from './constants'

export interface OfflineSessionState {
  session: SessionRecord | null
  /** Token has not expired. */
  valid: boolean
  /** Token expired but we are still inside the offline grace window. */
  grace: boolean
}

const EMPTY_STATE: OfflineSessionState = {
  session: null,
  valid: false,
  grace: false,
}

/**
 * Reads the last-known user id from localStorage.
 *
 * Kept outside IndexedDB so a user switch can be detected *before* the database
 * is opened, letting us wipe first and never race a read against stale rows.
 */
function readLastUserId(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.LAST_USER_ID)
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeLastUserId(userId: number | null): void {
  if (typeof window === 'undefined') return
  try {
    if (userId === null) {
      window.localStorage.removeItem(STORAGE_KEYS.LAST_USER_ID)
    } else {
      window.localStorage.setItem(STORAGE_KEYS.LAST_USER_ID, String(userId))
    }
  } catch {
    // Non-fatal.
  }
}

/**
 * S2 — Cross-user isolation on shared devices.
 *
 * Called on every authentication. If the authenticating user differs from
 * whoever last used this device — including the common case where the previous
 * user simply closed the tab instead of logging out — every local table and every
 * app-owned Cache Storage bucket is wiped BEFORE the new session is seeded.
 *
 * Relying on logout alone (as the original plan did) leaves the previous user's
 * cached content readable by the next one.
 *
 * @returns true when a wipe was performed.
 */
export async function enforceSessionOwner(userId: number): Promise<boolean> {
  // Normalise before comparing. The session payload is untyped at runtime and an
  // id arriving as "5" rather than 5 would never match the stored number, so every
  // render would look like a user switch and wipe the cache in a loop.
  const currentUserId = Number(userId)
  if (!Number.isFinite(currentUserId)) return false

  const previousUserId = readLastUserId()

  if (previousUserId !== null && previousUserId === currentUserId) {
    return false
  }

  if (previousUserId !== null && previousUserId !== currentUserId) {
    await wipeAllOfflineData()
    writeLastUserId(currentUserId)
    return true
  }

  // No record of a previous user. If the DB still holds a session row for a
  // different user, treat it as a switch and wipe defensively.
  try {
    const db = await openDb()
    if (db) {
      const existing = await db.sessions.toArray()
      const foreign = existing.some(
        (row) => Number(row.user_id) !== currentUserId
      )
      if (foreign) {
        await wipeAllOfflineData()
        writeLastUserId(currentUserId)
        return true
      }
    }
  } catch (error) {
    reportOfflineError('session_owner_check_failed', error)
  }

  writeLastUserId(currentUserId)
  return false
}

/**
 * Persists the offline session metadata.
 *
 * `grace_until` is computed from the server-provided token expiry rather than
 * purely from the device clock, so nudging the system clock forward cannot
 * extend the grace window (plan Layer 1.4 security note / Risk 5).
 */
export async function saveOfflineSession(params: {
  userId: number
  username?: string
  userMetadata: any
  roles: any
  /** Absolute token expiry (epoch ms) as issued by the server. */
  tokenExpiry: number
}): Promise<void> {
  const db = await openDb()
  if (!db) return

  const graceMs = getGracePeriodHours() * 60 * 60 * 1000
  const anchor = params.tokenExpiry > 0 ? params.tokenExpiry : Date.now()

  const record: SessionRecord = {
    user_id: params.userId,
    username: params.username,
    user_metadata: params.userMetadata ?? null,
    roles: params.roles ?? null,
    token_expiry: params.tokenExpiry,
    grace_until: anchor + graceMs,
    cached_at: Date.now(),
  }

  try {
    // Exactly one session row may exist at a time.
    await db.transaction('rw', db.sessions, async () => {
      await db.sessions.clear()
      await db.sessions.put(record)
    })
    writeLastUserId(params.userId)
  } catch (error) {
    reportOfflineError('session_save_failed', error)
  }
}

/** Reads the offline session and classifies it as valid / in-grace / unusable. */
export async function getOfflineSession(): Promise<OfflineSessionState> {
  const db = await openDb()
  if (!db) return EMPTY_STATE

  try {
    const rows = await db.sessions.toArray()
    if (rows.length === 0) return EMPTY_STATE

    const session = rows[0]
    const now = Date.now()

    // A missing expiry is not an expired one.
    //
    // The NextAuth JWT callback only stamps `tokens.expiry` after its FIRST
    // refresh, so a freshly logged-in session legitimately has no expiry at all.
    // Treating that absence as "expired" put every new login straight into the
    // grace state and showed "Your session has expired" to users who had just
    // signed in. Absence of evidence is not evidence of expiry.
    const expiryKnown = session.token_expiry > 0
    const valid = !expiryKnown || session.token_expiry > now
    const grace = !valid && session.grace_until > now

    return { session, valid, grace }
  } catch (error) {
    reportOfflineError('session_read_failed', error)
    return EMPTY_STATE
  }
}

/**
 * True when cached content may be shown offline.
 * Read-only by definition — a grace session never authorises a write.
 */
export async function isOfflineAuthValid(): Promise<boolean> {
  const state = await getOfflineSession()
  return state.session !== null && (state.valid || state.grace)
}

/** Role snapshot captured at last sync, used to gate offline UI (S7). */
export async function getOfflineRoles(): Promise<any | null> {
  const state = await getOfflineSession()
  return state.session?.roles ?? null
}

/** The user id owning local data, or null when there is no offline session. */
export async function getOfflineUserId(): Promise<number | null> {
  const state = await getOfflineSession()
  return state.session?.user_id ?? null
}

/**
 * Clears the session and every trace of cached user data.
 * Called on explicit logout (T6) and by `enforceSessionOwner` on user switch.
 */
export async function clearOfflineSession(): Promise<void> {
  await wipeAllOfflineData()
  writeLastUserId(null)
}

/** Wipes all local tables and app caches. */
async function wipeAllOfflineData(): Promise<void> {
  try {
    await clearAllTables()
  } catch (error) {
    reportOfflineError('table_wipe_failed', error)
  }
  await purgeAllAppCaches()
}
