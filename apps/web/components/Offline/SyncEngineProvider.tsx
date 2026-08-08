'use client'

/**
 * Root offline provider.
 *
 * Installs the two seams that make the app offline-capable:
 *   - a global `SWRConfig` whose fetcher is the offline-aware read path (Seam A),
 *     which covers every `useSWR` call site in the app without touching them;
 *   - the connectivity monitor, session mirror, and outbox drain wiring.
 *
 * BEHAVIOUR PRESERVATION (plan R5 #2): when the offline flags are off this
 * component still renders `SWRConfig`, but `offlineFetcher` delegates verbatim to
 * the existing `swrFetcher`, and none of the offline side effects are installed.
 * The app behaves exactly as it does today.
 *
 * Must be rendered inside `SessionProvider` so it can read the live session.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { SWRConfig } from 'swr'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'

import {
  offlineFetcher,
  setCacheUserProvider,
  installReadInterceptor,
} from '@/lib/offline/swr-fetcher'
import { setTokenProvider, drainOutbox } from '@/lib/offline/drain'
import {
  startConnectionMonitor,
  stopConnectionMonitor,
  subscribe as subscribeConnection,
  getConnectionStatus,
} from '@/lib/offline/connection'
import { openDb } from '@/lib/offline/db'
import { requestPersistentStorage } from '@/lib/offline/storage-policy'
import {
  enforceSessionOwner,
  saveOfflineSession,
  getOfflineSession,
} from '@/lib/offline/session-store'
import { syncEngine, type SyncContext } from '@/lib/offline/sync-engine'
import { getCounts, type OutboxCounts } from '@/lib/offline/outbox'
import { isOfflineEnabled, isOfflineWriteEnabled } from '@/lib/offline/config'
import {
  CONNECTION_STATUS,
  type ConnectionStatus,
} from '@/lib/offline/constants'
import { getDefaultOrg } from '@services/config/config'

interface OfflineContextValue {
  connectionStatus: ConnectionStatus
  isOffline: boolean
  /** Session token expired but still inside the offline grace window. */
  isOfflineGrace: boolean
  outbox: OutboxCounts
  /** Replays queued writes now. */
  sync: () => Promise<void>
  refreshOutbox: () => Promise<void>
}

const EMPTY_COUNTS: OutboxCounts = {
  pending: 0,
  retrying: 0,
  failed: 0,
  synced: 0,
  total: 0,
}

const OfflineContext = createContext<OfflineContextValue>({
  connectionStatus: CONNECTION_STATUS.ONLINE,
  isOffline: false,
  isOfflineGrace: false,
  outbox: EMPTY_COUNTS,
  sync: async () => {},
  refreshOutbox: async () => {},
})

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext)
}

export default function SyncEngineProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const session = useSession()
  const params = useParams()

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    CONNECTION_STATUS.ONLINE
  )
  const [outbox, setOutbox] = useState<OutboxCounts>(EMPTY_COUNTS)
  const [isOfflineGrace, setIsOfflineGrace] = useState(false)

  const enabled = isOfflineEnabled()

  // Kept in refs so the stable callbacks below always see current values without
  // re-registering listeners on every render.
  const tokenRef = useRef<string | null>(null)
  const userIdRef = useRef<number | null>(null)

  const sessionData = session?.data as any
  const accessToken: string | null = sessionData?.tokens?.access_token ?? null
  const userId: number | null = sessionData?.user?.id ?? null
  const roles = sessionData?.roles ?? null
  const tokenExpiry: number = sessionData?.tokens?.expiry ?? 0

  tokenRef.current = accessToken
  userIdRef.current = userId

  const orgSlug = useMemo(() => {
    const fromRoute = (params as any)?.orgslug
    if (typeof fromRoute === 'string' && fromRoute.length > 0) return fromRoute
    return getDefaultOrg()
  }, [params])

  const refreshOutbox = useCallback(async () => {
    if (!enabled) return
    setOutbox(await getCounts())
  }, [enabled])

  const sync = useCallback(async () => {
    if (!isOfflineWriteEnabled()) return
    await drainOutbox()
    await refreshOutbox()
  }, [refreshOutbox])

  // ── One-time subsystem bootstrap ──────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return

    // Providers are registered before anything can read them, so the drain and
    // the read cache always resolve the *current* identity rather than a
    // snapshot captured at mount.
    setTokenProvider(() => tokenRef.current)
    setCacheUserProvider(() => userIdRef.current)

    // The read seam proper: hooks `swrFetcher`, which every inline `useSWR`
    // fetcher in the app delegates to. Without this, only call sites relying on
    // the global SWRConfig fetcher below would be offline-capable.
    installReadInterceptor()

    void openDb()
    void requestPersistentStorage()

    const unsubscribe = subscribeConnection(setConnectionStatus)
    startConnectionMonitor(() => {
      // Reconnected: replay queued writes, then refresh permissions + content.
      void sync()
    })
    setConnectionStatus(getConnectionStatus())

    return () => {
      unsubscribe()
      stopConnectionMonitor()
      syncEngine.stopPeriodicSync()
    }
  }, [enabled, sync])

  // ── Service worker messages ───────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || typeof data.type !== 'string') return

      // The worker delegates to the page when a tab is open, because only the
      // page holds a live bearer token (S3).
      if (data.type === 'lh-drain-request') {
        void sync()
        return
      }

      if (data.type === 'lh-sync-complete' || data.type === 'lh-sync-error') {
        void refreshOutbox()
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [enabled, sync, refreshOutbox])

  // ── Session mirroring ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    if (session?.status !== 'authenticated' || userId === null) return

    let cancelled = false

    async function mirrorSession() {
      // S2 — wipe first if this device previously belonged to someone else.
      // Runs before any local read so stale rows can never be served.
      await enforceSessionOwner(userId as number)
      if (cancelled) return

      await saveOfflineSession({
        userId: userId as number,
        username: sessionData?.user?.username,
        userMetadata: sessionData?.user ?? null,
        roles,
        tokenExpiry,
      })
      if (cancelled) return

      const context: SyncContext = {
        orgSlug,
        userId: userId as number,
        accessToken: accessToken ?? '',
      }

      // Do not block first paint on sync.
      void syncEngine.initialSync(context)
      syncEngine.startPeriodicSync(() =>
        tokenRef.current && userIdRef.current !== null
          ? {
              orgSlug,
              userId: userIdRef.current,
              accessToken: tokenRef.current,
            }
          : null
      )

      await refreshOutbox()
    }

    void mirrorSession()
    return () => {
      cancelled = true
    }
    // `sessionData` is intentionally excluded: it is a new object every poll and
    // would restart sync every 60s. The primitives below capture real changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    session?.status,
    userId,
    tokenExpiry,
    orgSlug,
    accessToken,
    refreshOutbox,
  ])

  // ── Grace-window detection ────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function checkGrace() {
      const state = await getOfflineSession()
      if (!cancelled) setIsOfflineGrace(state.grace)
    }

    void checkGrace()
    return () => {
      cancelled = true
    }
  }, [enabled, connectionStatus])

  const value = useMemo<OfflineContextValue>(
    () => ({
      connectionStatus,
      isOffline: connectionStatus === CONNECTION_STATUS.OFFLINE,
      isOfflineGrace,
      outbox,
      sync,
      refreshOutbox,
    }),
    [connectionStatus, isOfflineGrace, outbox, sync, refreshOutbox]
  )

  return (
    <OfflineContext.Provider value={value}>
      <SWRConfig
        value={{
          fetcher: offlineFetcher,
          // Keeps the last good data on screen while revalidating, so a flaky
          // connection never blanks the UI.
          keepPreviousData: true,
          revalidateOnReconnect: true,
        }}
      >
        {children}
      </SWRConfig>
    </OfflineContext.Provider>
  )
}
