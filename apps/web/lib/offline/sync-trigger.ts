/**
 * Outbox sync trigger.
 *
 * MULTI-TAB SAFETY: the service worker is a singleton across all
 * tabs, so it — not the page — is the preferred drain coordinator. Tabs only ask
 * it to run. When Background Sync is unavailable (iOS Safari, Firefox desktop) we
 * fall back to draining in the page, which is why `drainOutbox` also exists.
 *
 * Kept in its own module so `offline-write.ts` can request a sync without
 * importing the drain implementation and creating a cycle.
 */

import { SYNC_TAG } from './constants'
import { capabilities } from './config'
import { reportOfflineError } from './db'

/**
 * Requests an outbox drain via the most reliable mechanism available.
 *
 * @returns how the request was dispatched, for observability/tests.
 */
export async function requestOutboxSync(): Promise<
  'background-sync' | 'page-drain' | 'unavailable'
> {
  // Preferred: let the worker do it, even if the tab closes.
  if (capabilities.hasServiceWorker() && capabilities.hasBackgroundSync()) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register(SYNC_TAG)
      return 'background-sync'
    } catch (error) {
      // Registration can fail (permission, quota). Fall through to page drain.
      reportOfflineError('background_sync_register_failed', error)
    }
  }

  // Fallback: drain in this tab. Imported lazily to avoid a module cycle and to
  // keep the drain code out of the bundle for callers that never need it.
  try {
    const { drainOutbox } = await import('./drain')
    void drainOutbox()
    return 'page-drain'
  } catch (error) {
    reportOfflineError('page_drain_dispatch_failed', error)
    return 'unavailable'
  }
}
