/** @type {import('common.next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // disable: process.env.NODE_ENV === 'development',
  // Only disable if explicitly set to true
  disable: process.env.DISABLE_PWA === 'true',
  publicExcludes: ['!runtime-config.js', '!umami/**/*'],
  buildExcludes: [/middleware-manifest\.json$/, /middleware-runtime\.js$/],
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
