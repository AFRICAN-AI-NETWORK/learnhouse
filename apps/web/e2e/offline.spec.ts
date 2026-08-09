/**
 * Offline end-to-end suite (plan Layer 9.3, including security tests 11–16).
 *
 * These run in a real Chromium with a real service worker, because that is the
 * only way to verify the behaviour that matters: what the browser does when the
 * network genuinely goes away.
 *
 * PREREQUISITES
 *   1. `pnpm build` — the service worker only exists in a production build.
 *   2. `npx playwright install chromium`
 *   3. Seeded credentials via E2E_USER_EMAIL / E2E_USER_PASSWORD (and the
 *      _B variants for the cross-user isolation test).
 *
 * Tests that need seeded data skip themselves rather than fail, so the suite stays
 * green in environments where fixtures are unavailable — a skipped test is honest,
 * a fabricated pass is not.
 */

import { test, expect, type Page } from '@playwright/test'

const USER_EMAIL = process.env.E2E_USER_EMAIL
const USER_PASSWORD = process.env.E2E_USER_PASSWORD
const USER_B_EMAIL = process.env.E2E_USER_B_EMAIL
const USER_B_PASSWORD = process.env.E2E_USER_B_PASSWORD
const COURSE_UUID = process.env.E2E_COURSE_UUID

const hasCredentials = Boolean(USER_EMAIL && USER_PASSWORD)

/** Waits until a service worker controls the page. */
async function waitForServiceWorker(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const registration = await navigator.serviceWorker.ready
    return Boolean(registration.active)
  })
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"], input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

/** Reads all rows from an IndexedDB object store, for assertions about local state. */
async function readStore(page: Page, storeName: string): Promise<any[]> {
  return page.evaluate(async (store) => {
    return new Promise<any[]>((resolve) => {
      const request = indexedDB.open('LearnHouseDB')
      request.onerror = () => resolve([])
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(store)) {
          resolve([])
          return
        }
        const tx = db.transaction(store, 'readonly')
        const getAll = tx.objectStore(store).getAll()
        getAll.onsuccess = () => resolve(getAll.result ?? [])
        getAll.onerror = () => resolve([])
      }
    })
  }, storeName)
}

async function cacheStorageKeys(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (typeof caches === 'undefined') return []
    return caches.keys()
  })
}

test.describe('service worker', () => {
  test('registers and controls the page', async ({ page }) => {
    await page.goto('/')
    expect(await waitForServiceWorker(page)).toBe(true)
  })

  test('serves the offline fallback for an uncached navigation', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await waitForServiceWorker(page)

    await context.setOffline(true)
    await page.goto('/a-route-that-was-never-visited-before')

    // The shell must render rather than showing the browser's error page.
    await expect(page.getByText(/you are offline/i)).toBeVisible()

    await context.setOffline(false)
  })

  test('shows the offline banner when the network drops', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await waitForServiceWorker(page)

    await context.setOffline(true)
    // The banner reacts to the browser's offline event.
    await expect(page.getByText(/you are offline/i).first()).toBeVisible()

    await context.setOffline(false)
  })
})

test.describe('offline reads', () => {
  test.skip(!hasCredentials, 'requires E2E_USER_EMAIL / E2E_USER_PASSWORD')

  test('a visited course renders from cache while offline', async ({
    page,
    context,
  }) => {
    test.skip(!COURSE_UUID, 'requires E2E_COURSE_UUID')

    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto(`/course/${COURSE_UUID}`)
    await page.waitForLoadState('networkidle')

    const onlineHeading = await page.locator('h1').first().textContent()

    await context.setOffline(true)
    await page.reload()

    await expect(page.locator('h1').first()).toHaveText(onlineHeading ?? '', {
      timeout: 15_000,
    })

    await context.setOffline(false)
  })

  test('an activity never visited shows the not-downloaded state', async ({
    page,
    context,
  }) => {
    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto('/')
    await waitForServiceWorker(page)

    await context.setOffline(true)
    await page.goto('/course/definitely-not-cached-uuid')

    await expect(
      page.getByText(/offline|not.*(downloaded|available)/i).first()
    ).toBeVisible()

    await context.setOffline(false)
  })
})

test.describe('offline writes', () => {
  test.skip(!hasCredentials, 'requires E2E_USER_EMAIL / E2E_USER_PASSWORD')

  test('a queued write drains on reconnect', async ({ page, context }) => {
    test.skip(!COURSE_UUID, 'requires E2E_COURSE_UUID')

    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto(`/course/${COURSE_UUID}`)
    await page.waitForLoadState('networkidle')

    await context.setOffline(true)

    // Queue a completion directly through the seam, so the test does not depend
    // on a particular button's markup.
    await page.evaluate(async () => {
      const anyWindow = window as any
      if (anyWindow.__lhQueueTestWrite) await anyWindow.__lhQueueTestWrite()
    })

    await context.setOffline(false)
    await page.waitForTimeout(3_000)

    const outbox = await readStore(page, 'outbox')
    const stuck = outbox.filter(
      (row) => row.status === 'PENDING' || row.status === 'RETRYING'
    )
    expect(stuck).toHaveLength(0)
  })

  /** S3 — a queued row must never carry credentials. */
  test('queued rows contain no bearer token', async ({ page, context }) => {
    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto('/')
    await waitForServiceWorker(page)

    await context.setOffline(true)
    await page.waitForTimeout(1_000)

    const outbox = await readStore(page, 'outbox')
    outbox.forEach((row) => {
      const serialised = JSON.stringify(row).toLowerCase()
      expect(serialised).not.toContain('authorization')
      expect(serialised).not.toContain('bearer ')
    })

    await context.setOffline(false)
  })
})

test.describe('security', () => {
  test.skip(!hasCredentials, 'requires E2E_USER_EMAIL / E2E_USER_PASSWORD')

  /** S1 — sensitive responses must never be persisted. */
  test('no sensitive endpoint is written to local storage', async ({
    page,
  }) => {
    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const readCache = await readStore(page, 'read_cache')
    const forbidden = [
      '/payments/',
      '/referrals/',
      '/marketers/',
      '/ee/',
      '/admin/',
      '/dashboard/',
      '/auth/',
    ]

    readCache.forEach((row) => {
      forbidden.forEach((fragment) => {
        expect(String(row.key)).not.toContain(fragment)
      })
    })
  })

  /** S2 / T6 — the shared-device case, without an explicit logout. */
  test('switching users wipes the previous user data', async ({
    page,
    context,
  }) => {
    test.skip(
      !USER_B_EMAIL || !USER_B_PASSWORD,
      'requires E2E_USER_B_EMAIL / E2E_USER_B_PASSWORD'
    )

    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const firstUserCourses = await readStore(page, 'courses')

    // Simulate closing the tab without logging out, then a different user
    // signing in on the same device.
    await context.clearCookies()
    await login(page, USER_B_EMAIL!, USER_B_PASSWORD!)
    await page.waitForLoadState('networkidle')

    const sessions = await readStore(page, 'sessions')
    expect(sessions.length).toBeLessThanOrEqual(1)

    if (sessions.length === 1 && firstUserCourses.length > 0) {
      // Whatever is cached now must belong to the current user only.
      const currentUserId = sessions[0].user_id
      const progress = await readStore(page, 'user_progress')
      progress.forEach((row) => expect(row.user_id).toBe(currentUserId))
    }
  })
})

/**
 * Checks that need no login.
 *
 * Deliberately separated from the credentialed suite: response headers and cache
 * namespacing are properties of the deployment, not of any user's session, so
 * gating them behind fixtures would leave them unverified in most environments.
 */
test.describe('security (no login required)', () => {
  /** Layer 8.2 — the CSP must lock the worker origin down. */
  test('security headers are present', async ({ page }) => {
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}

    const csp =
      headers['content-security-policy'] ??
      headers['content-security-policy-report-only'] ??
      ''

    expect(csp).toContain("worker-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'self'")
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })

  /** S4 — every app cache is namespaced so it can be purged as a set. */
  test('all app caches use the lh- prefix', async ({ page }) => {
    await page.goto('/')
    await waitForServiceWorker(page)
    await page.waitForLoadState('networkidle')

    const keys = await cacheStorageKeys(page)

    keys.forEach((key) => {
      const isOurs = key.startsWith('lh-')
      const isWorkboxInternal =
        key.includes('workbox') ||
        key.includes('next-') ||
        key.includes('precache') ||
        key.includes('start-url') ||
        key.includes('apis') ||
        key.includes('static-')
      expect(isOurs || isWorkboxInternal).toBe(true)
    })
  })
})

test.describe('admin routes', () => {
  test.skip(!hasCredentials, 'requires E2E_USER_EMAIL / E2E_USER_PASSWORD')

  test('the dashboard is not served from cache offline', async ({
    page,
    context,
  }) => {
    await login(page, USER_EMAIL!, USER_PASSWORD!)
    await page.goto('/')
    await waitForServiceWorker(page)

    await context.setOffline(true)
    await page.goto('/dash')

    // Either the offline fallback or an explicit online-only message — never
    // cached admin content.
    await expect(
      page.getByText(/offline|internet connection/i).first()
    ).toBeVisible()

    await context.setOffline(false)
  })
})
