/**
 * Connectivity singleton.
 *
 * Lives outside React because the service layer is not composed of components
 * and must be able to ask "are we online?" synchronously. React consumers get
 * the same state through `SyncEngineProvider`, which subscribes to this store.
 *
 * `navigator.onLine` alone is unreliable — it reports link state, not
 * reachability — so a lightweight health probe distinguishes ONLINE from
 * DEGRADED (connected to a network that cannot reach the API).
 */

import {
  CONNECTION_STATUS,
  OFFLINE_DEFAULTS,
  type ConnectionStatus,
} from './constants'
import { checkHealth } from '@services/utils/health'

type Listener = (status: ConnectionStatus) => void

const listeners = new Set<Listener>()

let status: ConnectionStatus = CONNECTION_STATUS.ONLINE
let consecutiveProbeFailures = 0
let probeTimer: ReturnType<typeof setInterval> | null = null
let started = false

/** Current connectivity state. Safe to call during SSR (returns ONLINE). */
export function getConnectionStatus(): ConnectionStatus {
  return status
}

export function isOffline(): boolean {
  return status === CONNECTION_STATUS.OFFLINE
}

/** True when writes should be queued rather than attempted. */
export function shouldQueueWrites(): boolean {
  return status === CONNECTION_STATUS.OFFLINE
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setStatus(next: ConnectionStatus): void {
  if (next === status) return
  status = next
  // Copy before iterating so a listener may unsubscribe during notification.
  const current = Array.from(listeners)
  for (let i = 0; i < current.length; i++) {
    try {
      current[i](next)
    } catch {
      // A misbehaving listener must not break connectivity tracking.
    }
  }
}

/**
 * Forces the status to OFFLINE/ONLINE from a browser event.
 * Exported for tests and for the reconnect path.
 */
export function setOnline(): void {
  consecutiveProbeFailures = 0
  setStatus(CONNECTION_STATUS.ONLINE)
}

export function setOffline(): void {
  setStatus(CONNECTION_STATUS.OFFLINE)
}

/**
 * Runs one reachability probe.
 *
 * A failure only escalates to DEGRADED after
 * `PROBE_FAILURE_THRESHOLD` consecutive misses, so a single dropped request on a
 * flaky mobile link does not flip the whole UI into a warning state.
 */
async function probe(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setStatus(CONNECTION_STATUS.OFFLINE)
    return
  }

  try {
    const result = await checkHealth()
    if (result && result.success) {
      consecutiveProbeFailures = 0
      setStatus(CONNECTION_STATUS.ONLINE)
      return
    }
    consecutiveProbeFailures++
  } catch {
    consecutiveProbeFailures++
  }

  if (consecutiveProbeFailures >= OFFLINE_DEFAULTS.PROBE_FAILURE_THRESHOLD) {
    setStatus(CONNECTION_STATUS.DEGRADED)
  }
}

/** Immediately re-checks reachability. Used after an `online` event. */
export async function refreshConnectionStatus(): Promise<ConnectionStatus> {
  await probe()
  return status
}

/**
 * Starts connectivity tracking. Idempotent.
 *
 * @param onReconnect invoked when connectivity is restored, so the caller can
 *                    trigger an outbox drain and permission refresh.
 */
export function startConnectionMonitor(onReconnect?: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (started) return stopConnectionMonitor

  started = true
  status =
    navigator.onLine === false
      ? CONNECTION_STATUS.OFFLINE
      : CONNECTION_STATUS.ONLINE

  const handleOnline = () => {
    setOnline()
    // Confirm real reachability, then let the caller sync.
    void refreshConnectionStatus().then(() => {
      if (onReconnect) onReconnect()
    })
  }

  const handleOffline = () => {
    setOffline()
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  probeTimer = setInterval(() => {
    void probe()
  }, OFFLINE_DEFAULTS.PROBE_INTERVAL_MS)

  // Seed the initial reading without waiting a full interval.
  void probe()

  cleanup = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (probeTimer !== null) {
      clearInterval(probeTimer)
      probeTimer = null
    }
    started = false
  }

  return stopConnectionMonitor
}

let cleanup: (() => void) | null = null

export function stopConnectionMonitor(): void {
  if (cleanup) {
    cleanup()
    cleanup = null
  }
}

/** Test seam: resets module state between test cases. */
export function __resetConnectionForTests(): void {
  stopConnectionMonitor()
  listeners.clear()
  status = CONNECTION_STATUS.ONLINE
  consecutiveProbeFailures = 0
}
