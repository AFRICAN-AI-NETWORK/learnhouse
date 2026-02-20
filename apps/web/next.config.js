/** @type {import('common.next').NextConfig} */
const withPWA = require('next-pwa')({
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
  // Ensure consistent build IDs across multiple pods in Kubernetes
  generateBuildId: async () => {
    return process.env.BUILD_ID || 'learnhouse-production'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 100], // Support both default and high-quality images
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

module.exports = withPWA(nextConfig)
