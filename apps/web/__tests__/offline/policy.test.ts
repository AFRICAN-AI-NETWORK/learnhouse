/**
 * Policy registry tests (plan Layer 9.1).
 *
 * These are the security regression tests for S1 (never cache sensitive data) and
 * S5 (never queue destructive or financial writes). If someone adds a rule that
 * weakens either invariant, these fail.
 */

import {
  getPolicy,
  canPersistRead,
  canQueueWrite,
  isSensitiveUrl,
  toApiRelativePath,
} from '@/lib/offline/policy'

const BASE = 'https://api.example.com/api/v1/'

describe('toApiRelativePath', () => {
  it('strips origin, api prefix, query and fragment', () => {
    expect(toApiRelativePath(`${BASE}courses/x/meta?a=1#frag`)).toBe(
      'courses/x/meta'
    )
  })

  it('handles already-relative paths', () => {
    expect(toApiRelativePath('courses/x')).toBe('courses/x')
  })
})

describe('S1 — sensitive endpoints are never persisted', () => {
  const sensitive = [
    'payments/1/config',
    'referrals/1/commission-balance',
    'marketers/1/dashboard',
    'ee/audit_logs/',
    'admin/analytics/overview',
    'dashboard/students',
    'auth/login',
    'code/execute',
    'ai/ask',
    'live_sessions/1/register',
    'users/session',
    'users/change_password/1',
    // Nested admin under an otherwise cacheable segment.
    'courses/1/admin/settings',
  ]

  it.each(sensitive)('%s is flagged sensitive', (path) => {
    expect(isSensitiveUrl(BASE + path)).toBe(true)
  })

  it.each(sensitive)('%s is never cacheable', (path) => {
    expect(canPersistRead(BASE + path)).toBe(false)
    expect(getPolicy(BASE + path, 'GET').read).toBe('never')
  })
})

describe('S5 — destructive and financial writes are never queued', () => {
  const blocked: Array<[string, string]> = [
    ['courses/c1', 'DELETE'],
    ['trail/remove_activity/a1/', 'DELETE'],
    ['assignments/a1/tasks/t1', 'DELETE'],
    ['payments/1/config', 'POST'],
    ['referrals/1/request-payout', 'POST'],
    ['marketers/1/kyc/upload', 'POST'],
    ['marketers/1/payment-method', 'POST'],
    ['users/change_password/1', 'PUT'],
    ['assignments/a1/submissions/u1/grade', 'POST'],
    ['orgs/1/invites', 'POST'],
    ['code/execute', 'POST'],
    ['courses/c1/thumbnail', 'PUT'],
    ['assignments/a1/tasks/t1/sub_file', 'POST'],
  ]

  it.each(blocked)('%s %s is blocked', (path, method) => {
    expect(canQueueWrite(BASE + path, method)).toBe(false)
    expect(getPolicy(BASE + path, method).write).toBe('block')
  })

  it('every blocked write carries a user-facing reason', () => {
    blocked.forEach(([path, method]) => {
      const reason = getPolicy(BASE + path, method).reason
      expect(typeof reason).toBe('string')
      expect((reason as string).length).toBeGreaterThan(0)
    })
  })

  it('blocks DELETE even on otherwise queueable endpoints', () => {
    // add_activity is queueable as POST...
    expect(canQueueWrite(`${BASE}trail/add_activity/a1/`, 'POST')).toBe(true)
    // ...but the same domain must refuse a DELETE.
    expect(canQueueWrite(`${BASE}trail/add_activity/a1/`, 'DELETE')).toBe(false)
  })
})

describe('learner writes that must remain queueable', () => {
  const queueable: Array<[string, string]> = [
    ['trail/add_activity/a1/', 'POST'],
    ['trail/add_course/c1/', 'POST'],
    ['blocks/quiz/1', 'POST'],
    ['assignments/a1/tasks/t1/submissions', 'PUT'],
    ['notifications/1/read', 'POST'],
    ['contact/', 'POST'],
  ]

  it.each(queueable)('%s %s is queueable', (path, method) => {
    expect(canQueueWrite(BASE + path, method)).toBe(true)
  })
})

describe('cacheable reads', () => {
  it.each([
    'courses/org_slug/x/page/1/limit/100',
    'chapters/1',
    'activities/activity_1',
    'collections/2',
    'trail/org_slug/default',
    'certifications/course/c1',
  ])('%s is cacheable', (path) => {
    expect(canPersistRead(BASE + path)).toBe(true)
  })

  it('gives certificates a long TTL and trail a short one', () => {
    const certTtl = getPolicy(`${BASE}certifications/course/c1`, 'GET').ttlMs
    const trailTtl = getPolicy(`${BASE}trail/org_slug/d`, 'GET').ttlMs
    expect(certTtl).toBeGreaterThan(trailTtl as number)
  })

  it('defaults unknown endpoints to not cacheable and not queueable', () => {
    const policy = getPolicy(`${BASE}some/unknown/endpoint`, 'POST')
    expect(policy.read).toBe('never')
    expect(policy.write).toBe('block')
  })
})
