import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  getResponseMetadata,
} from '@services/utils/ts/requests'

const MARKETERS_BASE = 'marketers'

export interface MarketerError {
  error_code: string
  message: string
  field?: string
}

export interface MarketerProfile {
  id: number
  status: string
  commission_rate_usd: number
  total_students_referred: number
  total_courses_sold: number
  total_earned_usd: number
  total_paid_usd: number
  referral_code?: {
    code: string
  }
}

export interface MonthlyRevenueRecord {
  month: number
  year: number
  courses_sold: number
  commission_earned_usd: number
  commissions_eligible_usd: number
  commissions_paid_usd: number
}

export interface MarketerDashboardData {
  profile: MarketerProfile
  summary: {
    total_students: number
    total_courses_sold: number
    total_earned_usd: number
    eligible_for_payout_usd: number
    pending_usd: number
    total_paid_usd: number
  }
  monthly_revenue: MonthlyRevenueRecord[]
  recent_students: any[]
  payout_info: any
  completeness_flags: {
    country_set: boolean
    phone_set: boolean
    kyc_verified: boolean
    payment_method_saved: boolean
  }
}

export interface MarketerPaymentMethod {
  payment_method_type: string
  currency: string
  country_code: string
  account_details_masked: Record<string, string>
}

// ... I will add other interfaces as needed

export async function registerAsMarketer(
  access_token: string,
  org_id: string,
  data: {
    first_name: string
    last_name: string
    phone_number: string
    country_code: string
  }
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(data),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getMarketerDashboard(
  access_token: string,
  org_id: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/dashboard`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json as MarketerDashboardData, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function savePaymentMethod(
  access_token: string,
  org_id: string,
  data: any
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/payment-method`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(data),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getPaymentMethod(access_token: string, org_id: string) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/payment-method`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function deletePaymentMethod(
  access_token: string,
  org_id: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/payment-method`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function uploadKYCDocuments(
  access_token: string,
  org_id: string,
  formData: FormData
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/kyc/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: formData, // Do not set Content-Type, fetch sets it to multipart/form-data with boundary automatically
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getKYCStatus(access_token: string, org_id: string) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/kyc/status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function requestMarketerPayout(
  access_token: string,
  org_id: string,
  amount: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/request-payout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ amount }),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getMarketerPayoutHistory(
  access_token: string,
  org_id: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/payout-history?limit=20`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getMarketerStudents(
  access_token: string,
  org_id: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/students?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function getMarketerMonthlyRevenue(
  access_token: string,
  org_id: string,
  year: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/monthly-revenue?year=${year}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

// Admin Methods
export async function adminGetMarketers(
  access_token: string,
  org_id: string,
  status: string = 'pending_approval',
  page: number = 1,
  limit: number = 50
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/all?status=${status}&page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminGetMarketerStats(
  access_token: string,
  org_id: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/stats`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminGetLeaderboard(
  access_token: string,
  org_id: string,
  limit: number = 10
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/leaderboard?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminApproveMarketer(
  access_token: string,
  org_id: string,
  marketer_id: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/${marketer_id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminRejectMarketer(
  access_token: string,
  org_id: string,
  marketer_id: number,
  reason: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/${marketer_id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ reason }),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminSuspendMarketer(
  access_token: string,
  org_id: string,
  marketer_id: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/${marketer_id}/suspend`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminReactivateMarketer(
  access_token: string,
  org_id: string,
  marketer_id: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/${marketer_id}/reactivate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminGetKYCQueue(
  access_token: string,
  org_id: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/kyc/pending?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminApproveKYC(
  access_token: string,
  org_id: string,
  kyc_id: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/kyc/${kyc_id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminRejectKYC(
  access_token: string,
  org_id: string,
  kyc_id: number,
  reason: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/kyc/${kyc_id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ reason }),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminGetMarketerPayouts(
  access_token: string,
  org_id: string,
  status: string = 'requested',
  page: number = 1,
  limit: number = 50
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/payouts?status=${status}&page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminApproveMarketerPayout(
  access_token: string,
  org_id: string,
  payout_id: number
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/payouts/${payout_id}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}

export async function adminRejectMarketerPayout(
  access_token: string,
  org_id: string,
  payout_id: number,
  reason: string
) {
  try {
    const result = await fetch(
      `${getAPIUrl()}${MARKETERS_BASE}/${org_id}/admin/payouts/${payout_id}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ reason }),
      }
    )

    if (!result.ok) {
      const errorData = await result.json()
      return { success: false, data: null, error: errorData as MarketerError }
    }

    const json = await result.json()
    return { success: true, data: json, error: null }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: { error_code: 'MKTR_500', message: 'Failed to connect to server' },
    }
  }
}
