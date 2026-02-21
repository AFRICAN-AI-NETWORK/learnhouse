// ─── Enums ────────────────────────────────────────────────────────────────────

export enum CommissionStatus {
  PENDING = 'pending',
  ELIGIBLE = 'eligible',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
}

// ─── Core Types ────────────────────────────────────────────────────────────────

export interface ReferralCode {
  id: number
  code: string
  user_id: number
  referral_link: string
  created_at: string
  total_referrals: number
}

export interface CommissionBalance {
  total_earned: number
  eligible_balance: number
  pending_balance: number
  currency: string
}

export interface CommissionRecord {
  id: number
  referral_code: string
  referred_user_id: number
  referred_username: string
  amount: number
  currency: string
  status: CommissionStatus
  completion_date: string | null
  eligible_date: string | null
  created_at: string
}

// ─── Payout Types ─────────────────────────────────────────────────────────────

export interface PayoutRequestPayload {
  amount: number
  bank_name: string
  account_number: string
  account_holder: string
  account_type: string
  country_code: string
}

export interface PayoutResponse {
  id: number
  status: PayoutStatus
  amount: number
  currency: string
  created_at: string
  message: string
}
