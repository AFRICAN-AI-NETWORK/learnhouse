/**
 * Seam A — the offline-aware read path.
 *
 * This is the correction that makes the whole plan tractable: client reads in this
 * codebase go through SWR (~175 `useSWR` call sites), NOT through the service
 * layer. Wrapping the service GET functions would have missed nearly every read.
 * Installing one fetcher on a global `SWRConfig` makes every one of those call
 * sites offline-capable without editing a single component.
 *
 * BEHAVIOUR PRESERVATION (plan R5 #1/#3): on a successful network read this
 * returns exactly what `swrFetcher` returns today, so no component's rendering
 * changes. Cache reads and writes only happen around that unchanged core.
 */

import { swrFetcher, setSwrReadInterceptor } from '@services/utils/ts/requests'
import { openDb, reportOfflineError } from './db'
import { canPersistRead, getReadTtlMs, isSensitiveUrl } from './policy'
import { isOfflineReadEnabled } from './config'
import { isOffline } from './connection'

/** Thrown when offline and nothing usable is cached, so SWR surfaces an error state. */
export class OfflineUnavailableError extends Error {
  readonly isOfflineUnavailable = true
  constructor(
    message = 'This content has not been downloaded for offline use.'
  ) {
    super(message)
    this.name = 'OfflineUnavailableError'
  }
}

/** SWR keys in this codebase are either a URL or `[key, token]`. Normalise both. */
function normaliseKey(key: unknown): { url: string; token?: string } | null {
  if (typeof key === 'string') return { url: key }
  if (Array.isArray(key) && typeof key[0] === 'string') {
    return {
      url: key[0],
      token: typeof key[1] === 'string' ? key[1] : undefined,
    }
  }
  return null
}

/**
 * Reads a previously cached response.
 * Rows are scoped by user id so one account can never serve another's data (T6).
 */
async function readFromCache(
  url: string,
  userId: number | null
): Promise<{ hit: boolean; data?: any; stale: boolean }> {
  const db = await openDb()
  if (!db) return { hit: false, stale: false }

  try {
    const row = await db.read_cache.get(url)
    if (!row) return { hit: false, stale: false }

    // Never serve another user's cached response.
    if (row.user_id !== null && userId !== null && row.user_id !== userId) {
      return { hit: false, stale: false }
    }

    const ttl = getReadTtlMs(url)
    const stale = ttl !== undefined && Date.now() - row.cached_at > ttl

    return { hit: true, data: row.data, stale }
  } catch (error) {
    reportOfflineError('read_cache_get_failed', error)
    return { hit: false, stale: false }
  }
}

/**
 * Persists a successful response, subject to policy.
 *
 * S1: sensitive endpoints are refused here as a hard gate, independent of the
 * caller, so a new call site cannot accidentally cache admin or financial data.
 */
async function writeToCache(
  url: string,
  data: any,
  userId: number | null
): Promise<void> {
  if (isSensitiveUrl(url) || !canPersistRead(url)) return

  // Never persist a response we cannot attribute to a user.
  //
  // Rows are keyed by URL, so an unattributed row is readable by whoever comes
  // next. Worse, a read that races ahead of the session returns the *anonymous*
  // shape of a resource (an empty org list, for instance) and caching that would
  // hand it to the authenticated user moments later.
  if (userId === null) return

  const db = await openDb()
  if (!db) return

  try {
    await db.read_cache.put({
      key: url,
      data,
      cached_at: Date.now(),
      user_id: userId,
    })
  } catch (error) {
    // Quota errors are expected under pressure and must never break a read.
    reportOfflineError('read_cache_put_failed', error)
  }
}

/** Supplies the id of the user owning cache rows. Set by the provider at boot. */
let currentUserIdProvider: () => number | null = () => null

export function setCacheUserProvider(provider: () => number | null): void {
  currentUserIdProvider = provider
}

/**
 * THE offline read implementation — one function, two entry points.
 *
 * Order of operations:
 *   1. Feature off → run the network read verbatim. Zero new behaviour.
 *   2. Offline → serve cache, or raise `OfflineUnavailableError`.
 *   3. Online → fetch; on success persist (policy permitting); on *transport*
 *      failure fall back to cache so a flaky link degrades instead of erroring.
 *      An HTTP error (401/403/404) always surfaces — never masked by cache.
 */
async function readThroughCache(
  url: string,
  network: () => Promise<any>
): Promise<any> {
  if (!isOfflineReadEnabled()) {
    return network()
  }

  const userId = currentUserIdProvider()

  if (isOffline()) {
    const cached = await readFromCache(url, userId)
    if (cached.hit) return cached.data
    throw new OfflineUnavailableError()
  }

  try {
    const data = await network()
    // Fire-and-forget: persistence must never delay or fail a successful read.
    void writeToCache(url, data, userId)
    return data
  } catch (error) {
    // Distinguish "server said no" from "couldn't reach the server". Only the
    // latter may be served from cache — an auth or permission error must surface.
    if (isNetworkError(error)) {
      const cached = await readFromCache(url, userId)
      if (cached.hit) return cached.data
    }
    throw error
  }
}

/**
 * Installs the interceptor inside `swrFetcher`.
 *
 * This is what actually delivers offline reads: 102 of the app's 103 `useSWR`
 * call sites pass their own inline fetcher (`(url) => swrFetcher(url, token)`),
 * which overrides any global `SWRConfig` fetcher. Hooking `swrFetcher` covers all
 * of them from a single place instead of editing a hundred components.
 *
 * Idempotent, and safe to call before the flags are on — `readThroughCache`
 * short-circuits to the network while the feature is dark.
 */
export function installReadInterceptor(): void {
  setSwrReadInterceptor((url, _token, network) =>
    readThroughCache(url, network)
  )
}

/** Removes the interceptor, restoring the original fetcher. Used by tests. */
export function uninstallReadInterceptor(): void {
  setSwrReadInterceptor(null)
}

/**
 * Global `SWRConfig` fetcher, for the handful of call sites that do not pass one.
 * Shares the exact same implementation as the interceptor above.
 */
export async function offlineFetcher(...args: any[]): Promise<any> {
  const key = args.length === 1 ? args[0] : args
  const parsed = normaliseKey(key)

  if (!parsed) {
    // Unrecognised key shape: preserve today's behaviour exactly.
    return swrFetcher(typeof key === 'string' ? key : String(key))
  }

  const { url, token } = parsed
  // `swrFetcher` already routes through the interceptor when installed, so this
  // must not wrap again — doing so would double-cache and double-count.
  return swrFetcher(url, token)
}

/**
 * True for transport-level failures.
 *
 * `errorHandling` attaches `status` for HTTP errors, so an error without one
 * came from `fetch` itself (DNS, offline, TLS, aborted).
 */
function isNetworkError(error: unknown): boolean {
  if (!error) return false
  const status = (error as any)?.status
  if (typeof status === 'number') return false
  return (
    error instanceof TypeError ||
    /failed to fetch|network|load failed/i.test(String((error as any)?.message))
  )
}

/**
 * Pre-seeds the read cache from a known-good payload.
 * Used by the sync engine and the Download-for-offline action so content is
 * available before the user ever visits the page.
 */
export async function primeReadCache(url: string, data: any): Promise<void> {
  await writeToCache(url, data, currentUserIdProvider())
}

/** Reads a cached response without touching the network. */
export async function peekReadCache(url: string): Promise<any | null> {
  const cached = await readFromCache(url, currentUserIdProvider())
  return cached.hit ? cached.data : null
}
