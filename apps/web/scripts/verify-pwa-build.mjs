#!/usr/bin/env node
/**
 * Service worker build validation.
 *
 * A service worker with a broken or stale precache manifest does not fail loudly —
 * it silently breaks the offline experience for every existing user on their next
 * visit, and they keep the broken worker until it is replaced. That makes this a
 * build gate rather than a runtime concern.
 *
 * Run after `next build`:  node scripts/verify-pwa-build.mjs
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const PUBLIC_DIR = join(process.cwd(), 'public')
const NEXT_DIR = join(process.cwd(), '.next')

const failures = []
const warnings = []

function fail(message) {
  failures.push(message)
}

function warn(message) {
  warnings.push(message)
}

function readIfPresent(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

// ── 1. The worker exists and is not a stub ───────────────────────────────────
const swPath = join(PUBLIC_DIR, 'sw.js')
const sw = readIfPresent(swPath)

if (!sw) {
  fail('public/sw.js was not generated. Is DISABLE_PWA set during the build?')
} else if (sw.trim().length < 1000) {
  fail(`public/sw.js is suspiciously small (${sw.length} bytes) — likely a stub.`)
}

// ── 2. Workbox is available to the worker ────────────────────────────────────
// `@ducanh2912/next-pwa` bundles Workbox *into* sw.js (webpack InjectManifest)
// rather than importing a separate runtime by filename, so the check is that the
// strategies are actually present in the bundle — not that a workbox-*.js file is
// referenced. An emitted workbox-*.js is incidental.
const publicFiles = existsSync(PUBLIC_DIR) ? readdirSync(PUBLIC_DIR) : []
const workboxFiles = publicFiles.filter(
  (name) => name.startsWith('workbox-') && name.endsWith('.js')
)

if (sw) {
  const bundledStrategies = ['NetworkFirst', 'CacheFirst', 'StaleWhileRevalidate']
  const missing = bundledStrategies.filter((name) => !sw.includes(name))

  const referencesRuntimeFile = workboxFiles.some((name) => sw.includes(name))

  if (missing.length > 0 && !referencesRuntimeFile) {
    fail(
      `sw.js neither bundles Workbox strategies (missing: ${missing.join(', ')}) ` +
        'nor imports a workbox runtime file.'
    )
  }

  // Routes must actually be registered, or the worker is inert.
  if (!sw.includes('registerRoute') && !sw.includes('addRoute')) {
    fail('sw.js registers no routes — runtime caching would not apply.')
  }
}

// ── 3. Custom worker (background sync) is present and wired in ───────────────
const workerFiles = publicFiles.filter(
  (name) => name.startsWith('worker-') && name.endsWith('.js')
)

if (workerFiles.length === 0) {
  fail(
    'No worker-*.js custom worker emitted. Check `customWorkerDir` in next.config.js.'
  )
} else {
  const customWorker = readIfPresent(join(PUBLIC_DIR, workerFiles[0]))
  if (customWorker && !customWorker.includes('lh-outbox-sync')) {
    fail('Custom worker does not register the lh-outbox-sync tag.')
  }
  if (sw && !workerFiles.some((name) => sw.includes(name))) {
    fail('sw.js does not import the emitted custom worker.')
  }
}

// ── 4. Runtime caching rules survived the build ──────────────────────────────
if (sw) {
  const requiredCaches = [
    'lh-api-data-v1',
    'lh-media-v1',
    'lh-images-v1',
    'lh-fonts-v1',
  ]
  requiredCaches.forEach((cacheName) => {
    if (!sw.includes(cacheName)) {
      fail(`sw.js is missing the ${cacheName} runtime cache rule.`)
    }
  })

  // S1 — sensitive endpoints must be NetworkOnly, never cached.
  if (!sw.includes('NetworkOnly')) {
    fail('sw.js has no NetworkOnly rule — sensitive endpoints may be cached.')
  }
}

// ── 4b. Every precached public asset actually exists ─────────────────────────
// Workbox fails the ENTIRE service worker install if a single precached URL
// cannot be fetched, and a failed install means no offline support at all — with
// no user-visible error. This caught two real 404s (`/assets/illustrations/*.png`)
// that silently killed the worker, so it is a hard gate rather than a warning.
if (sw) {
  const precachedUrls = Array.from(sw.matchAll(/url:"([^"]+)"/g)).map(
    (match) => match[1]
  )

  if (precachedUrls.length === 0) {
    warn('No precache manifest entries found in sw.js.')
  }

  const missing = precachedUrls
    // `/_next/**` is emitted by the build, not shipped in public/.
    .filter((url) => !url.startsWith('/_next/'))
    // Entries without a file extension are Next.js *routes* (e.g. `/offline`,
    // added via additionalManifestEntries). They are served by the app, not from
    // public/, so a disk check does not apply — their reachability is covered by
    // the E2E offline-fallback test instead.
    .filter((url) => /\.[a-z0-9]+$/i.test(url.split('?')[0]))
    .filter((url) => {
      const relative = url.split('?')[0].replace(/^\//, '')
      if (!relative) return false
      return !existsSync(join(PUBLIC_DIR, decodeURIComponent(relative)))
    })

  if (missing.length > 0) {
    fail(
      `Precache references ${missing.length} file(s) missing from public/: ` +
        `${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}. ` +
        'The service worker install would fail and offline support would be dead.'
    )
  }
}

// ── 5. Offline assets are shipped ────────────────────────────────────────────
if (!existsSync(join(PUBLIC_DIR, 'offline-placeholder.svg'))) {
  fail('public/offline-placeholder.svg is missing.')
}

if (!existsSync(join(PUBLIC_DIR, 'manifest.json'))) {
  fail('public/manifest.json is missing.')
} else {
  const manifest = JSON.parse(
    readFileSync(join(PUBLIC_DIR, 'manifest.json'), 'utf8')
  )
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    fail('manifest.json declares no icons.')
  }
  if (manifest.display !== 'standalone') {
    warn(`manifest.json display is "${manifest.display}", expected "standalone".`)
  }
}

// ── 6. Build ID consistency across replicas (plan 10.2) ──────────────────────
const buildIdPath = join(NEXT_DIR, 'BUILD_ID')
const buildId = readIfPresent(buildIdPath)?.trim()

if (!buildId) {
  warn('.next/BUILD_ID not found — run this after `next build`.')
} else if (process.env.CI && buildId === 'learnhouse-production') {
  // The fallback means BUILD_ID was not injected. Different pods would then be
  // free to serve different manifests under the same identifier.
  fail(
    'BUILD_ID fell back to the default. Set BUILD_ID=$(git rev-parse HEAD) in CI ' +
      'so every replica serves an identical service worker manifest.'
  )
}

// ── 7. The offline route was built ───────────────────────────────────────────
const offlineRoute = join(NEXT_DIR, 'server', 'app', 'offline.html')
if (!existsSync(offlineRoute) && !existsSync(join(NEXT_DIR, 'server', 'app', 'offline'))) {
  warn('The /offline route does not appear in the build output.')
}

// ── Report ───────────────────────────────────────────────────────────────────
if (warnings.length > 0) {
  console.warn('\nPWA build warnings:')
  warnings.forEach((message) => console.warn(`  ! ${message}`))
}

if (failures.length > 0) {
  console.error('\nPWA build validation FAILED:')
  failures.forEach((message) => console.error(`  x ${message}`))
  console.error('')
  process.exit(1)
}

console.log('PWA build validation passed.')
if (buildId) console.log(`  build id: ${buildId}`)
if (workboxFiles.length) console.log(`  workbox:  ${workboxFiles.join(', ')}`)
if (workerFiles.length) console.log(`  worker:   ${workerFiles.join(', ')}`)
