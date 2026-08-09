#!/usr/bin/env node
/**
 * Bundle size budget.
 *
 * Offline support adds Dexie (~45 KB gzipped) plus the offline modules. That is a
 * deliberate, bounded cost — this check keeps it bounded, so the next addition has
 * to be a conscious decision rather than a silent regression.
 *
 * Implemented with gzip-size measurement over the emitted chunks rather than an
 * extra dependency: fewer moving parts, and it runs anywhere Node does.
 *
 * Run after `next build`:  node scripts/check-bundle-size.mjs
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const CHUNKS_DIR = join(process.cwd(), '.next', 'static', 'chunks')

/**
 * Budgets in KB (gzipped).
 *
 * `totalChunks` is the aggregate first-party JS budget. Raise it only with a note
 * in the PR explaining what earned the space.
 */
const BUDGETS = {
  largestChunkKb: 400,
  totalChunksKb: 3500,
}

if (!existsSync(CHUNKS_DIR)) {
  console.error('No .next/static/chunks directory. Run `next build` first.')
  process.exit(1)
}

function collectJsFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      results.push(...collectJsFiles(full))
    } else if (entry.endsWith('.js')) {
      results.push(full)
    }
  }
  return results
}

const files = collectJsFiles(CHUNKS_DIR)

let totalGzip = 0
let largest = { name: '', gzipKb: 0 }

for (const file of files) {
  const gzipKb = gzipSync(readFileSync(file)).length / 1024
  totalGzip += gzipKb
  if (gzipKb > largest.gzipKb) {
    largest = { name: file.replace(process.cwd(), ''), gzipKb }
  }
}

const totalKb = Math.round(totalGzip)
const largestKb = Math.round(largest.gzipKb)

console.log('Bundle size (gzipped):')
console.log(`  chunks:        ${files.length}`)
console.log(`  total:         ${totalKb} KB  (budget ${BUDGETS.totalChunksKb} KB)`)
console.log(
  `  largest chunk: ${largestKb} KB  (budget ${BUDGETS.largestChunkKb} KB)  ${largest.name}`
)

const failures = []

if (totalKb > BUDGETS.totalChunksKb) {
  failures.push(
    `Total chunk size ${totalKb} KB exceeds the ${BUDGETS.totalChunksKb} KB budget.`
  )
}

if (largestKb > BUDGETS.largestChunkKb) {
  failures.push(
    `Largest chunk ${largestKb} KB exceeds the ${BUDGETS.largestChunkKb} KB budget (${largest.name}).`
  )
}

if (failures.length > 0) {
  console.error('\nBundle size budget exceeded:')
  failures.forEach((message) => console.error(`  x ${message}`))
  console.error(
    '\nEither trim the addition or raise the budget in scripts/check-bundle-size.mjs ' +
      'with a note explaining what earned the space.\n'
  )
  process.exit(1)
}

console.log('\nBundle size within budget.')
