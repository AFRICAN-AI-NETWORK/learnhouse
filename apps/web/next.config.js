/** @type {import('common.next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

// Cacheability rules are shared with the app's offline policy registry so the
// service worker allowlist and the in-page denylist can never drift apart.
// See apps/web/lib/offline/sw-cache-patterns.js (plan S1 / 8.7 #1).
const {
  buildCacheableApiRegExp,
  buildSensitiveApiRegExp,
} = require('./lib/offline/sw-cache-patterns')

const CACHEABLE_API_REGEXP = buildCacheableApiRegExp()
const SENSITIVE_API_REGEXP = buildSensitiveApiRegExp()

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // disable: process.env.NODE_ENV === 'development',
  // Only disable if explicitly set to true
  disable: process.env.DISABLE_PWA === 'true',
  publicExcludes: ['!runtime-config.js', '!umami/**/*'],
  buildExcludes: [/middleware-manifest\.json$/, /middleware-runtime\.js$/],

  // Background-sync/outbox logic lives in apps/web/worker/index.js.
  // NOTE: this fork's option is `customWorkerDir` — `customWorkerSrc` is a no-op.
  customWorkerDir: 'worker',

  // Serve the app shell for uncached navigations so React can mount offline and
  // render from IndexedDB. Using the built-in fallback support rather than a
  // hand-rolled fetch handler keeps one code path for this behaviour.
  fallbacks: {
    document: '/offline',
    image: '/offline-placeholder.svg',
  },

  // Keep the fork's sensible defaults (Next.js build assets, pages, JSON data)
  // and layer our API/media rules on top rather than replacing them.
  extendDefaultRuntimeCaching: true,

  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Removes stale precache revisions only. Our `lh-*` runtime caches are
    // intentionally left intact across worker versions so a deploy does not wipe
    // a learner's downloaded content (plan Risk 4).
    cleanupOutdatedCaches: true,

    runtimeCaching: [
      // ── Never cache sensitive surfaces (S1). Must precede the API rule. ──
      {
        urlPattern: SENSITIVE_API_REGEXP,
        handler: 'NetworkOnly',
      },
      // ── Umami analytics must never be replayed from cache. ──
      {
        urlPattern: /\/umami\//,
        handler: 'NetworkOnly',
      },
      // ── Cacheable API reads: fresh when possible, cached when not. ──
      {
        urlPattern: CACHEABLE_API_REGEXP,
        method: 'GET',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'lh-api-data-v1',
          // A slow link still gets live data; an offline one falls back fast
          // instead of leaving the user waiting.
          networkTimeoutSeconds: 4,
          expiration: { maxEntries: 500, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      // ── Backend-served media (`/content/**`) and static documents. ──
      {
        urlPattern: /\/content\/.*\.(?:png|jpg|jpeg|gif|webp|svg|pdf)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'lh-media-v1',
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
          rangeRequests: true,
        },
      },
      // ── Next.js image optimisation output. ──
      {
        urlPattern: /\/_next\/image\?/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'lh-images-v1',
          expiration: { maxEntries: 300, maxAgeSeconds: 3 * 24 * 60 * 60 },
          cacheableResponse: { statuses: [200] },
        },
      },
      // ── Font files, wherever they are served from. ──
      {
        urlPattern: /\.(?:woff2?|eot|ttf|otf)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'lh-fonts-v1',
          expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
    ],
  },
})

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/umami/script.js',
        destination: `https://eu.umami.is/script.js`,
      },
      {
        source: '/umami/api/send',
        destination: `https://eu.umami.is/api/send`,
      },
    ]
  },
  reactStrictMode: false,
  output: 'standalone',
  experimental: {
    serverActions: {
      // Server Action POSTs are proxied to 127.0.0.1 by proxy.ts, so the Host
      // header no longer matches the browser's Origin. Without this allowlist
      // Next.js rejects the action with a 500 (origin/host mismatch).
      allowedOrigins: [
        process.env.NEXT_PUBLIC_LEARNHOUSE_DOMAIN || 'localhost:3000',
        `*.${process.env.NEXT_PUBLIC_LEARNHOUSE_TOP_DOMAIN || 'localhost'}`,
        '127.0.0.1:3000',
      ],
    },
  },
  // Ensure consistent build IDs across multiple pods in Kubernetes
  generateBuildId: async () => {
    return process.env.BUILD_ID || 'learnhouse-production'
  },

  images: {
    // In development, localhost resolves to private IPs (::1, 127.0.0.1) which
    // Next.js Image Optimization blocks. Disable optimization in dev to avoid this.
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 100], // Support both default and high-quality images
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
}

// Generate runtime config for development
if (process.env.NODE_ENV === 'development') {
  const fs = require('fs')
  const path = require('path')
  const runtimeConfig = {}

  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('NEXT_PUBLIC_')) {
      runtimeConfig[key] = process.env[key]
    }
  })

  const publicDir = path.join(__dirname, 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })

  fs.writeFileSync(
    path.join(publicDir, 'runtime-config.js'),
    `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
    'utf8'
  )
}

const finalConfig = withPWA(nextConfig)

module.exports =
  process.env.NODE_ENV === 'development'
    ? finalConfig
    : withSentryConfig(finalConfig, {
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: true,
        disableLogger: true,
      })
