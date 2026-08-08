/**
 * Offline runtime configuration.
 *
 * Reads `NEXT_PUBLIC_OFFLINE_*` values through the app's existing `getConfig()`
 * helper, so offline settings participate in the same runtime-config mechanism as
 * everything else (`window.__RUNTIME_CONFIG__` → `runtime-config.json` →
 * `process.env`). Defaults come from `constants.ts` so there is exactly one
 * place a default is written down.
 *
 * NOTE: these variables MUST carry the `NEXT_PUBLIC_` prefix to reach the browser
 * (plan Layer -1 R3). The service worker cannot read them at all and uses
 * `OFFLINE_DEFAULTS` directly.
 */

import { getConfig } from '@services/config/config'
import { OFFLINE_DEFAULTS } from './constants'

function readNumber(key: string, fallback: number): number {
  const raw = getConfig(key, '')
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function readBoolean(key: string, fallback: boolean): boolean {
  const raw = getConfig(key, '')
  if (!raw) return fallback
  return raw === 'true' || raw === '1'
}

/**
 * Master switches. Both default to OFF so the offline subsystem ships dark and
 * the app is behaviourally identical until explicitly enabled (plan R5 #2).
 */
export const isOfflineReadEnabled = (): boolean =>
  readBoolean('NEXT_PUBLIC_OFFLINE_READ_ENABLED', false)

export const isOfflineWriteEnabled = (): boolean =>
  readBoolean('NEXT_PUBLIC_OFFLINE_WRITE_ENABLED', false)

/** True when any part of the offline subsystem should initialise. */
export const isOfflineEnabled = (): boolean =>
  isOfflineReadEnabled() || isOfflineWriteEnabled()

export const getCacheMaxMb = (persisted: boolean): number =>
  readNumber(
    'NEXT_PUBLIC_OFFLINE_CACHE_MAX_MB',
    persisted
      ? OFFLINE_DEFAULTS.CACHE_MAX_MB_PERSISTED
      : OFFLINE_DEFAULTS.CACHE_MAX_MB
  )

export const getGracePeriodHours = (): number =>
  readNumber(
    'NEXT_PUBLIC_OFFLINE_GRACE_PERIOD_HOURS',
    OFFLINE_DEFAULTS.GRACE_PERIOD_HOURS
  )

export const isVideoCacheEnabled = (): boolean =>
  readBoolean(
    'NEXT_PUBLIC_OFFLINE_ENABLE_VIDEO_CACHE',
    OFFLINE_DEFAULTS.ENABLE_VIDEO_CACHE
  )

export const getSyncRetryMax = (): number =>
  readNumber(
    'NEXT_PUBLIC_OFFLINE_SYNC_RETRY_MAX',
    OFFLINE_DEFAULTS.SYNC_RETRY_MAX
  )

/** Browser capability probes — used to choose sync strategy and degrade gracefully. */
export const capabilities = {
  hasIndexedDb: (): boolean =>
    typeof window !== 'undefined' && 'indexedDB' in window,

  hasServiceWorker: (): boolean =>
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator,

  /** iOS Safari and Firefox desktop lack this; we fall back to page-context drain. */
  hasBackgroundSync: (): boolean =>
    typeof window !== 'undefined' &&
    'ServiceWorkerRegistration' in window &&
    'sync' in (window as any).ServiceWorkerRegistration.prototype,

  hasStorageManager: (): boolean =>
    typeof navigator !== 'undefined' &&
    !!navigator.storage &&
    typeof navigator.storage.estimate === 'function',
}
