#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Server wrapper for Next.js standalone mode
 * This script generates a runtime config file from environment variables
 * and injects them before starting the Next.js server.
 */
const fs = require('fs')
const path = require('path')

// Read all NEXT_PUBLIC_* environment variables from the environment
const env = process.env

// Collect all NEXT_PUBLIC_* variables from the environment
const runtimeConfig = {}
Object.keys(env).forEach((key) => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    runtimeConfig[key] = env[key]
    process.env[key] = env[key]
  }
})

// Write runtime config JSON file to multiple possible search locations
const configPaths = [
  path.join(__dirname, 'runtime-config.json'),
  path.join(__dirname, '.next', 'standalone', 'runtime-config.json'),
]

configPaths.forEach((cp) => {
  try {
    const dir = path.dirname(cp)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(cp, JSON.stringify(runtimeConfig, null, 2), 'utf8')
    console.log(`✅ Wrote runtime-config.json to ${cp}`)
  } catch (error) {
    console.warn(
      `⚠️ Could not write runtime-config.json to ${cp}: ${error.message}`
    )
  }
})

console.log(`📋 Variables found: ${Object.keys(runtimeConfig).join(', ')}`)

// Create client-side runtime config script for browser access
const scriptContent = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`

// All possible public directories - write to ALL of them
const allPublicDirs = [
  path.join(__dirname, '.next', 'standalone', 'public'), // Next.js standalone (PRIORITY!)
  path.join(__dirname, 'public'), // Standard location
]

let successCount = 0
for (const publicDir of allPublicDirs) {
  try {
    // Create directory if it doesn't exist
    fs.mkdirSync(publicDir, { recursive: true })
    const scriptPath = path.join(publicDir, 'runtime-config.js')
    fs.writeFileSync(scriptPath, scriptContent, 'utf8')
    console.log(`✅ Wrote runtime-config.js to ${scriptPath}`)
    successCount++
  } catch (error) {
    console.warn(`⚠️ Could not write to ${publicDir}: ${error.message}`)
  }
}

if (successCount > 0) {
  console.log(
    `📋 Runtime config contains ${Object.keys(runtimeConfig).length} variables (written to ${successCount} locations)`
  )
} else {
  console.error('❌ Failed to write runtime-config.js to any location')
  console.error(
    '⚠️ Client-side config will rely on server-side rendering fallback'
  )
}

// Set default HOSTNAME if not provided
if (!process.env.HOSTNAME) {
  process.env.HOSTNAME = '0.0.0.0'
}

// Set PORT from environment or default to 3000
if (!process.env.PORT) {
  process.env.PORT = '3000'
}

// Now require and run the actual Next.js server
try {
  require('./.next/standalone/server.js')
  console.log('✅ Started Next.js server (Nixpacks build)')
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    try {
      require('./server.js')
      console.log('✅ Started Next.js server (Dockerfile build)')
    } catch (fallbackError) {
      console.error('❌ Failed to start Next.js server:')
      console.error('   Tried: ./.next/standalone/server.js')
      console.error('   Tried: ./server.js')
      console.error('   Error:', fallbackError.message)
      process.exit(1)
    }
  } else {
    throw error
  }
}
