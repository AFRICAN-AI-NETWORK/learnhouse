#!/usr/bin/env node

/**
 * Server wrapper for Next.js standalone mode
 * This script generates a runtime config file from environment variables
 * and injects them before starting the Next.js server.
 */

const fs = require('fs');
const path = require('path');

// Read all NEXT_PUBLIC_* environment variables from the environment
const env = process.env;

// Collect all NEXT_PUBLIC_* variables from the environment
const runtimeConfig = {};

Object.keys(env).forEach((key) => {
  if (key.startsWith('NEXT_PUBLIC_')) {
    runtimeConfig[key] = env[key];
    process.env[key] = env[key];
  }
});

// Write runtime config JSON file
const configPath = path.join(__dirname, 'runtime-config.json');
fs.writeFileSync(configPath, JSON.stringify(runtimeConfig, null, 2), 'utf8');
console.log(`✅ Wrote runtime-config.json to ${configPath}`);

// Create client-side runtime config script for browser access
// In Next.js standalone, public files are served from the standalone output's public directory
// Try multiple possible locations for the public directory
const possiblePublicDirs = [
  path.join(__dirname, 'public'),           // Standard location
  path.join(__dirname, '.next/static'),     // Standalone static assets
  path.join(__dirname, '.next/standalone/public'), // Alternative location
];

let publicDir = null;
for (const dir of possiblePublicDirs) {
  if (fs.existsSync(dir)) {
    publicDir = dir;
    console.log(`✅ Found public directory at: ${dir}`);
    break;
  }
}

// If no existing public dir found, create one
if (!publicDir) {
  publicDir = path.join(__dirname, 'public');
  console.log(`📁 Creating public directory at: ${publicDir}`);
  fs.mkdirSync(publicDir, { recursive: true });
}

try {
  const scriptPath = path.join(publicDir, 'runtime-config.js');
  const scriptContent = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`;
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  console.log(`✅ Wrote runtime-config.js to ${scriptPath}`);
  console.log(`📋 Runtime config contains ${Object.keys(runtimeConfig).length} variables`);
} catch (error) {
  console.error('❌ Failed to create runtime-config.js:', error.message);
  console.error('⚠️ Client-side config will rely on server-side rendering fallback');
}

// Set default HOSTNAME if not provided
if (!process.env.HOSTNAME) {
  process.env.HOSTNAME = '0.0.0.0';
}

// Set PORT from environment or default to 3000
if (!process.env.PORT) {
  process.env.PORT = '3000';
}

// Now require and run the actual Next.js server
// Try both Nixpacks and Dockerfile paths for compatibility
try {
  // Nixpacks puts server in .next/standalone/
  require('./.next/standalone/server.js');
  console.log('✅ Started Next.js server (Nixpacks build)');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    try {
      // Dockerfile puts server in root
      require('./server.js');
      console.log('✅ Started Next.js server (Dockerfile build)');
    } catch (fallbackError) {
      console.error('❌ Failed to start Next.js server:');
      console.error('   Tried: ./.next/standalone/server.js');
      console.error('   Tried: ./server.js');
      console.error('   Error:', fallbackError.message);
      process.exit(1);
    }
  } else {
    throw error;
  }
}

