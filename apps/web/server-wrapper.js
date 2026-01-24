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

// -----------------------------------------------------------------------------
// 2. Write runtime-config.json (optional, for debugging)
// -----------------------------------------------------------------------------
const jsonPath = path.join(__dirname, 'runtime-config.json');
fs.writeFileSync(jsonPath, JSON.stringify(runtimeConfig, null, 2), 'utf8');
console.log(`✅ Wrote runtime-config.json → ${jsonPath}`);

// -----------------------------------------------------------------------------
// 3. Write runtime-config.js to the ONLY valid public directory
//    Next.js standalone serves files from:
//    .next/standalone/public
// -----------------------------------------------------------------------------
const publicDir = path.join(__dirname, '.next', 'standalone', 'public');

fs.mkdirSync(publicDir, { recursive: true });

const jsPath = path.join(publicDir, 'runtime-config.js');
const jsContent = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`;

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
