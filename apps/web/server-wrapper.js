#!/usr/bin/env node

/**
 * Server wrapper for Next.js standalone mode
 * Generates runtime-config.js from NEXT_PUBLIC_* env vars
 * and starts the Next.js server correctly.
 */

const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// 1. Collect NEXT_PUBLIC_* env variables
// -----------------------------------------------------------------------------
const runtimeConfig = {};

for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    runtimeConfig[key] = value;
  }
}

console.log(`📋 Collected ${Object.keys(runtimeConfig).length} NEXT_PUBLIC_* variables`);

// Create client-side runtime config script for browser access
// In Next.js standalone, public files are served from .next/standalone/public/
// We write to ALL possible locations to ensure it works in all environments

const scriptContent = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`;

// All possible public directories - write to ALL of them
const allPublicDirs = [
  path.join(__dirname, '.next', 'standalone', 'public'),  // Next.js standalone (PRIORITY!)
  path.join(__dirname, 'public'),                          // Standard location
];

let successCount = 0;
for (const publicDir of allPublicDirs) {
  try {
    // Create directory if it doesn't exist
    fs.mkdirSync(publicDir, { recursive: true });

    const scriptPath = path.join(publicDir, 'runtime-config.js');
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');
    console.log(`✅ Wrote runtime-config.js to ${scriptPath}`);
    successCount++;
  } catch (error) {
    console.warn(`⚠️ Could not write to ${publicDir}: ${error.message}`);
  }
}

if (successCount > 0) {
  console.log(`📋 Runtime config contains ${Object.keys(runtimeConfig).length} variables (written to ${successCount} locations)`);
} else {
  console.error('❌ Failed to write runtime-config.js to any location');
  console.error('⚠️ Client-side config will rely on server-side rendering fallback');
}

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`✅ Wrote runtime-config.js → ${jsPath}`);

// -----------------------------------------------------------------------------
// 4. Ensure correct host + port
// -----------------------------------------------------------------------------
process.env.HOSTNAME ||= '0.0.0.0';
process.env.PORT ||= '3000';

// -----------------------------------------------------------------------------
// 5. Start Next.js standalone server
// -----------------------------------------------------------------------------
try {
  require('./.next/standalone/server.js');
  console.log('🚀 Next.js standalone server started');
} catch (err) {
  console.error('❌ Failed to start Next.js standalone server');
  console.error(err);
  process.exit(1);
}
