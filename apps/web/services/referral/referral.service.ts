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
  access_token: string
): Promise<{ success: boolean; data: ReferralCode | null; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/generate`,
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
  access_token: string
): Promise<{ success: boolean; data: ReferralCode | null; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/my-code`,
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
export async function getCommissionBalance(access_token: string): Promise<{
  success: boolean
  data: CommissionBalance | null
  error?: string
}> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/balance`,
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
export async function getCommissionHistory(access_token: string): Promise<{
  success: boolean
  data: CommissionRecord[]
  error?: string
}> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/commissions`,
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
  access_token: string
): Promise<{ success: boolean; data: PayoutResponse | null; error?: string }> {
  try {
    const result = await fetch(
      `${getAPIUrl()}${REFERRAL_BASE}/payout`,
      RequestBodyWithAuthHeader('POST', payload, null, access_token)
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
