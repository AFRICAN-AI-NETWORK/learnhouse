import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  getResponseMetadata,
} from '@services/utils/ts/requests'
import type {
  ReferralCode,
  CommissionBalance,
  CommissionRecord,
  PayoutRequestPayload,
  PayoutResponse,
} from 'types/referral'

const REFERRAL_BASE = 'referrals'

/**
 * Generate a new referral code for the authenticated user.
 */
export async function generateReferralCode(
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: ReferralCode | null; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/generate-code`,
      RequestBodyWithAuthHeader('POST', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) {
      return { success: true, data: res.data as ReferralCode }
    }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Failed to generate referral code',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Get the authenticated user's existing referral code.
 */
export async function getMyReferralCode(
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: ReferralCode | null; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/my-code`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) {
      return { success: true, data: res.data as ReferralCode }
    }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'No referral code found',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Get the authenticated user's commission balance.
 */
export async function getCommissionBalance(
  access_token: string,
  org_id: string
): Promise<{
  success: boolean
  data: CommissionBalance | null
  error?: string
}> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/commission-balance`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) {
      return { success: true, data: res.data as CommissionBalance }
    }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Failed to load balance',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Get the authenticated user's commission history.
 */
export async function getCommissionHistory(
  access_token: string,
  org_id: string
): Promise<{
  success: boolean
  data: CommissionRecord[]
  error?: string
}> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/commission-history`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) {
      return { success: true, data: res.data as CommissionRecord[] }
    }
    return {
      success: false,
      data: [],
      error: res.data?.detail ?? 'Failed to load commission history',
    }
  } catch {
    return { success: false, data: [], error: 'Network error' }
  }
}

/**
 * Request a payout of eligible commission balance.
 */
export async function requestPayout(
  payload: PayoutRequestPayload,
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: PayoutResponse | null; error?: string }> {
  try {
    const params = new URLSearchParams({ amount: payload.amount.toString() })
    const { amount, ...bodyWithoutAmount } = payload

    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/request-payout?${params}`,
      RequestBodyWithAuthHeader('POST', bodyWithoutAmount, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) {
      return { success: true, data: res.data as PayoutResponse }
    }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Payout request failed',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

// ==================== Admin Endpoints ====================

/**
 * Get referral leaderboard and summary stats (admin only).
 */
export async function getAdminReferralStats(
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: any; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/admin/stats`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) return { success: true, data: res.data }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Failed to load stats',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Get flagged referral signups (admin only).
 */
export async function getAdminFlaggedReferrals(
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: any; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/admin/flagged`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) return { success: true, data: res.data }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Failed to load flagged referrals',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Get pending payout requests (admin only).
 */
export async function getAdminPendingPayouts(
  access_token: string,
  org_id: string
): Promise<{ success: boolean; data: any; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/admin/payouts`,
      RequestBodyWithAuthHeader('GET', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) return { success: true, data: res.data }
    return {
      success: false,
      data: null,
      error: res.data?.detail ?? 'Failed to load payouts',
    }
  } catch {
    return { success: false, data: null, error: 'Network error' }
  }
}

/**
 * Approve a payout request (admin only).
 */
export async function approvePayoutRequest(
  access_token: string,
  org_id: string,
  payout_id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/admin/payouts/${payout_id}/approve`,
      RequestBodyWithAuthHeader('POST', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) return { success: true }
    return {
      success: false,
      error: res.data?.detail ?? 'Failed to approve payout',
    }
  } catch {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Reject a payout request (admin only).
 */
export async function rejectPayoutRequest(
  access_token: string,
  org_id: string,
  payout_id: number,
  reason: string = 'Rejected by admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({ reason })
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/${org_id}/admin/payouts/${payout_id}/reject?${params}`,
      RequestBodyWithAuthHeader('POST', null, null, access_token)
    )
    const res = await getResponseMetadata(result)
    if (res.success) return { success: true }
    return {
      success: false,
      error: res.data?.detail ?? 'Failed to reject payout',
    }
  } catch {
    return { success: false, error: 'Network error' }
  }
}
