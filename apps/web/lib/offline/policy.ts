/**
 * THE offline policy registry — SINGLE SOURCE OF TRUTH.
 *
 * Every offline decision in the app resolves here:
 *   - the read seam  (`swr-fetcher.ts`)  asks: may I persist this response?
 *   - the write seam (`offline-write.ts`) asks: may I queue this mutation, or must I block?
 *   - the service worker asks the same questions via `sw-cache-patterns.js`.
 *
 * The Layer 5 matrix in the implementation plan is the *human* view of this table.
 * Policy is encoded once, here — never re-implemented inside individual services.
 *
 * Security invariants enforced by this module:
 *   S1  sensitive endpoints are never persisted
 *   S5  destructive + financial mutations are never queued
 */

import {
  API_PREFIX_PATTERN,
  SENSITIVE_API_PATTERNS,
  CACHEABLE_API_SEGMENTS,
} from './sw-cache-patterns'

/** Whether a GET response for this endpoint may be persisted locally. */
export type ReadPolicy = 'cache' | 'never'

/**
 * What happens to a mutation issued while offline.
 * - `queue`: written to the outbox and replayed verbatim on reconnect.
 * - `block`: refused with a clear message. Never enqueued.
 */
export type WritePolicy = 'queue' | 'block'

export interface EndpointPolicy {
  read: ReadPolicy
  write: WritePolicy
  /** Never persist, and purge on logout / user switch. */
  sensitive: boolean
  /** Optional freshness hint for cached reads, in milliseconds. */
  ttlMs?: number
  /** Human-readable reason, surfaced to the user when a write is blocked. */
  reason?: string
}

interface PolicyRule extends Partial<EndpointPolicy> {
  /** Matched against the API-relative path (e.g. `courses/course_x/meta`). */
  pattern: RegExp
  /** When present, the rule only applies to these HTTP verbs. */
  methods?: string[]
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/** Conservative default: readable if allowlisted, never queue what we don't understand. */
const DEFAULT_POLICY: EndpointPolicy = {
  read: 'never',
  write: 'block',
  sensitive: false,
  reason: 'This action requires an internet connection.',
}

const SENSITIVE_REGEXPS = SENSITIVE_API_PATTERNS.map(
  (p: string) => new RegExp(p)
)

const CACHEABLE_SEGMENT_SET = new Set<string>(CACHEABLE_API_SEGMENTS)

/**
 * Ordered rules — FIRST MATCH WINS, so the most specific patterns come first.
 * Derived directly from the audited service classification (plan Layer -1 R6).
 */
const RULES: PolicyRule[] = [
  // ─── Hard blocks: financial, credential, destructive, live-only (S5) ────────
  {
    // Any payout / KYC / payment-method mutation, under either referral surface.
    pattern:
      /^(referrals|marketers)\/.*(request-payout|payout|kyc|payment-method)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Payout and verification actions require an internet connection.',
  },
  {
    pattern: /^payments(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Payments require an internet connection.',
  },
  {
    pattern: /^(referrals|marketers)(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Partner and marketer actions require an internet connection.',
  },
  {
    pattern: /^users\/(change_password|reset_password)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Password changes require an internet connection.',
  },
  {
    pattern: /^auth(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Authentication requires an internet connection.',
  },
  {
    pattern: /^code\/execute/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Running code requires an internet connection.',
  },
  {
    pattern: /^ai(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'AI features require an internet connection.',
  },
  {
    pattern: /^live_sessions(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Live sessions require an internet connection.',
  },
  {
    pattern: /^(ee|admin|dashboard)(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Administration requires an internet connection.',
  },
  {
    pattern: /(^|\/)admin(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Administration requires an internet connection.',
  },
  {
    pattern: /^waitlist(\/|$)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Waitlist actions require an internet connection.',
  },
  {
    // Invite tokens are time-sensitive and validated server-side.
    pattern: /^orgs\/[^/]+\/(invites|invites_with_usergroups|signup_mechanism)/,
    read: 'never',
    write: 'block',
    sensitive: true,
    reason: 'Invitations require an internet connection.',
  },
  {
    // Grading is an authority decision — never optimistic.
    pattern: /^assignments\/.*\/(grade|revision)/,
    read: 'cache',
    write: 'block',
    sensitive: false,
    ttlMs: 5 * MINUTE,
    reason: 'Grading requires an internet connection.',
  },
  {
    // Binary uploads: unreliable to buffer, and quota-hostile.
    pattern: /\/(thumbnail|logo|avatar|preview|sub_file|ref_file|upload)(\/|$)/,
    write: 'block',
    reason: 'File uploads require an internet connection.',
  },

  // ─── Queueable learner writes ──────────────────────────────────────────────
  {
    // Activity completion / course enrolment — the core offline write path.
    pattern: /^trail\/(add_activity|remove_activity|add_course|remove_course)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
  },
  {
    pattern: /^blocks\/quiz(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
  },
  {
    // Text submissions queue; the binary-upload rule above already blocks files.
    pattern: /^assignments\/.*\/submissions/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 5 * MINUTE,
  },
  {
    pattern: /^notifications\/.*(read|read-all)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 2 * MINUTE,
  },
  {
    pattern: /^contact(\/|$)/,
    read: 'never',
    write: 'queue',
    sensitive: false,
  },

  // ─── Cacheable reads with domain-appropriate freshness ─────────────────────
  {
    pattern: /^orgs(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: HOUR,
  },
  {
    pattern:
      /^(courses|chapters|activities|blocks|collections|prerequisites)(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: HOUR,
  },
  {
    // Certificates are immutable once issued — safe to cache aggressively.
    pattern: /^certifications(\/|$)/,
    read: 'cache',
    write: 'block',
    sensitive: false,
    ttlMs: 7 * 24 * HOUR,
  },
  {
    pattern: /^trail(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 5 * MINUTE,
  },
  {
    pattern: /^(roles|usergroups)(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 30 * MINUTE,
  },
  {
    pattern: /^(announcements|notifications|communications)(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 5 * MINUTE,
  },
  {
    pattern: /^assignments(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: 5 * MINUTE,
  },
  {
    pattern: /^users(\/|$)/,
    read: 'cache',
    write: 'queue',
    sensitive: false,
    ttlMs: HOUR,
  },
  {
    pattern: /^search(\/|$)/,
    read: 'cache',
    write: 'block',
    sensitive: false,
    ttlMs: 10 * MINUTE,
  },
  {
    pattern: /^cohorts(\/|$)/,
    read: 'cache',
    write: 'block',
    sensitive: false,
    ttlMs: 30 * MINUTE,
  },
]

/**
 * Reduces an absolute or relative URL to its API-relative path.
 * `https://api.host/api/v1/courses/x/meta?q=1` → `courses/x/meta`
 */
export function toApiRelativePath(url: string): string {
  let path = url

  // Drop scheme + host if present, without needing a valid base URL.
  const prefixIndex = path.indexOf(API_PREFIX_PATTERN)
  if (prefixIndex !== -1) {
    path = path.slice(prefixIndex + API_PREFIX_PATTERN.length)
  } else {
    path = path.replace(/^https?:\/\/[^/]+\/?/, '').replace(/^\/+/, '')
  }

  // Strip query string and fragment — policy is path-scoped.
  path = path.split('?')[0].split('#')[0]

  return path.replace(/^\/+/, '')
}

/** True when the endpoint must never touch Cache Storage or IndexedDB (S1). */
export function isSensitiveUrl(url: string): boolean {
  const path = toApiRelativePath(url)
  return SENSITIVE_REGEXPS.some((re: RegExp) => re.test(path))
}

/** Resolves the effective policy for a URL + method. */
export function getPolicy(url: string, method: string = 'GET'): EndpointPolicy {
  const path = toApiRelativePath(url)
  const verb = method.toUpperCase()

  let resolved: EndpointPolicy = { ...DEFAULT_POLICY }

  // Allowlisted top-level segments are readable by default; specific rules refine this.
  const segment = path.split('/')[0]
  if (CACHEABLE_SEGMENT_SET.has(segment)) {
    resolved.read = 'cache'
  }

  // Tracks whether a rule supplied its own message, so the DELETE guard below
  // does not overwrite a more specific explanation with a generic one.
  let hasRuleReason = false

  for (let i = 0; i < RULES.length; i++) {
    const rule = RULES[i]
    if (rule.methods && rule.methods.indexOf(verb) === -1) continue
    if (!rule.pattern.test(path)) continue

    resolved = {
      read: rule.read ?? resolved.read,
      write: rule.write ?? resolved.write,
      sensitive: rule.sensitive ?? resolved.sensitive,
      ttlMs: rule.ttlMs ?? resolved.ttlMs,
      reason: rule.reason ?? resolved.reason,
    }
    hasRuleReason = rule.reason !== undefined
    break
  }

  // Sensitive endpoints can never be cached, whatever a broader rule implied.
  if (resolved.sensitive || isSensitiveUrl(url)) {
    resolved.read = 'never'
    resolved.sensitive = true
  }

  // S5: DELETE is never queued. A replayed delete after the user changed their
  // mind — or after permissions changed — is a data-integrity hazard.
  if (verb === 'DELETE') {
    resolved.write = 'block'
    if (!hasRuleReason) {
      resolved.reason = 'Deleting requires an internet connection.'
    }
  }

  return resolved
}

/** True when a successful GET response for this URL may be persisted. */
export function canPersistRead(url: string): boolean {
  return getPolicy(url, 'GET').read === 'cache'
}

/** True when an offline mutation may be queued for later replay. */
export function canQueueWrite(url: string, method: string): boolean {
  return getPolicy(url, method).write === 'queue'
}

/** User-facing explanation for a blocked offline action. */
export function getBlockedReason(url: string, method: string): string {
  return (
    getPolicy(url, method).reason ??
    'This action requires an internet connection.'
  )
}

/** Freshness hint for a cached read, if the domain defines one. */
export function getReadTtlMs(url: string): number | undefined {
  return getPolicy(url, 'GET').ttlMs
}
