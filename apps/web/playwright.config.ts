import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for the offline suite.
 *
 * The offline tests exercise the real service worker, so they must run against a
 * production build — `next dev` does not register one (and `DISABLE_PWA` would
 * skip generation entirely). They also require Chromium specifically: Firefox and
 * WebKit lack Background Sync, which several assertions depend on.
 *
 * Setup:  pnpm build && npx playwright install chromium
 * Run:    pnpm test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  // Service worker registration and sync are inherently timing-sensitive.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Offline state is per-browser-context and the tests mutate IndexedDB, so
  // parallelism across workers would make them flaky.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html']] : [['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The service worker requires a secure context; localhost qualifies.
    serviceWorkers: 'allow',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_OFFLINE_READ_ENABLED: 'true',
          NEXT_PUBLIC_OFFLINE_WRITE_ENABLED: 'true',
        },
      },
})
