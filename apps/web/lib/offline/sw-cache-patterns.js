/**
 * Cacheability patterns shared across the JS/TS boundary — SINGLE SOURCE OF TRUTH.
 *
 * `next.config.js` (CommonJS) requires this to build the service worker's
 * runtime-caching rules, and `lib/offline/policy.ts` imports it to make the same
 * decisions in the page context. Keeping both consumers on one module is what
 * prevents the SW allowlist and the app denylist from drifting apart.
 *
 * Plain CommonJS + no dependencies on purpose. Do not convert to TypeScript.
 */

/**
 * API path segments (immediately after `/api/v1/`) whose GET responses may be
 * persisted for offline reads.
 *
 * Verified against `apps/api/src/router.py` — note the real prefixes are `trail`
 * (singular) and that schedules/grade are mounted under `courses`.
 */
const CACHEABLE_API_SEGMENTS = [
  'orgs',
  'courses',
  'chapters',
  'activities',
  'blocks',
  'collections',
  'certifications',
  'assignments',
  'trail',
  'users',
  'roles',
  'usergroups',
  'announcements',
  'notifications',
  'communications',
  'search',
  'cohorts',
  'prerequisites',
]

/**
 * Endpoints that must NEVER be written to Cache Storage or IndexedDB — financial,
 * admin, credential, or live-only surfaces.
 *
 * ANCHORED at the start of the API-relative path. Any match denies caching.
 */
const SENSITIVE_API_PREFIXES = [
  'payments',
  'referrals',
  'marketers',
  'ee',
  'admin',
  'dashboard',
  'auth',
  'code',
  'webhooks',
  'dev',
  'ai',
  'live_sessions',
  'waitlist',
  'contact',
  'health',
]

/** Anchored patterns that are more specific than a bare segment. */
const SENSITIVE_API_PATHS = [
  // User-identity + credential surfaces.
  'users/session',
  'users/profile',
  'users/reset_password',
  'users/change_password',
  // Chat websocket ticketing is single-use and must never be replayed from cache.
  'chat/ws',
]

/**
 * Fragments that deny caching wherever they appear in the path, not just at the
 * start — e.g. `courses/123/admin/settings`. These need separate handling because
 * an anchored pattern would miss the nested case entirely.
 */
const SENSITIVE_PATH_FRAGMENTS = ['admin']

/** Full pattern list, API-relative and regex-ready, for the in-page policy layer. */
const SENSITIVE_API_PATTERNS = SENSITIVE_API_PREFIXES.map(function (segment) {
  return '^' + segment + '(/|$)'
})
  .concat(
    SENSITIVE_API_PATHS.map(function (path) {
      return '^' + path
    })
  )
  .concat(
    SENSITIVE_PATH_FRAGMENTS.map(function (fragment) {
      return '(^|/)' + fragment + '(/|$)'
    })
  )

/** Matches the API prefix so callers can normalise absolute URLs to API-relative paths. */
const API_PREFIX_PATTERN = '/api/v1/'

/**
 * Builds the RegExp the service worker uses to decide which API GETs are eligible
 * for `NetworkFirst` caching: an allowlisted segment that is not sensitive.
 *
 * Path-based (not host-based) because the service worker cannot read the app's
 * runtime config to learn the API origin (plan W5).
 */
function buildCacheableApiRegExp() {
  return new RegExp(
    API_PREFIX_PATTERN.replace(/\//g, '\\/') +
      '(' +
      CACHEABLE_API_SEGMENTS.join('|') +
      ')(\\/|\\?|$)'
  )
}

/**
 * Builds the RegExp matching every never-cache endpoint.
 *
 * Two alternations are needed, not one: anchored patterns must sit immediately
 * after `/api/v1/`, while fragments like `admin` must also match when nested
 * (`courses/123/admin/...`). Splicing an anchored pattern after the prefix would
 * silently drop the nested case.
 */
function buildSensitiveApiRegExp() {
  const prefix = API_PREFIX_PATTERN.replace(/\//g, '\\/')

  const anchored = SENSITIVE_API_PREFIXES.map(function (segment) {
    return segment + '(?:\\/|\\?|$)'
  }).concat(SENSITIVE_API_PATHS)

  const nested = SENSITIVE_PATH_FRAGMENTS.map(function (fragment) {
    return fragment + '(?:\\/|\\?|$)'
  })

  return new RegExp(
    '(?:' +
      prefix +
      '(?:' +
      anchored.join('|') +
      '))|(?:' +
      prefix +
      '.*\\/(?:' +
      nested.join('|') +
      '))'
  )
}

module.exports = {
  CACHEABLE_API_SEGMENTS,
  SENSITIVE_API_PREFIXES,
  SENSITIVE_API_PATHS,
  SENSITIVE_PATH_FRAGMENTS,
  SENSITIVE_API_PATTERNS,
  API_PREFIX_PATTERN,
  buildCacheableApiRegExp,
  buildSensitiveApiRegExp,
}
