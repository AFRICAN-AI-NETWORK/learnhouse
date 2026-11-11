'use client'

import React from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export interface AccessDiagnostics {
  auto_renew?: boolean
  current_period_end?: string | null
  grace_period_start_date?: string | null
  grace_period_ends_at?: string | null
  is_in_grace_period?: boolean
  is_expiring_soon?: boolean
  is_expired?: boolean
  days_remaining?: number | null
  grace_days_remaining?: number | null
  payment_status?: string | null
  user_has_payment?: boolean
  is_admin?: boolean
  is_author?: boolean
  course_linked_to_product?: boolean
}

interface SubscriptionRenewalBannerProps {
  diagnostics?: AccessDiagnostics | null
  hasAccess: boolean
  onRenew: () => void
  compact?: boolean
}

export default function SubscriptionRenewalBanner({
  diagnostics,
  hasAccess,
  onRenew,
  compact = false,
}: SubscriptionRenewalBannerProps) {
  if (!diagnostics) return null

  const {
    is_in_grace_period,
    is_expiring_soon,
    is_expired,
    grace_days_remaining,
    days_remaining,
    auto_renew,
  } = diagnostics

  if (hasAccess && !is_in_grace_period && !is_expiring_soon) {
    return null
  }
  if (!hasAccess && !is_expired) {
    return null
  }

  const isGrace = Boolean(hasAccess && is_in_grace_period)
  const isExpiredState = Boolean(!hasAccess && is_expired)

  const title = isExpiredState
    ? 'Subscription Expired'
    : isGrace
      ? auto_renew
        ? 'Card Renewal Failed — Grace Period'
        : 'Monthly Renewal Due — Grace Period'
      : 'Monthly Access Expiring Soon'

  const description = isExpiredState
    ? 'Your monthly billing and 7-day grace window ended. Renew via Bank Transfer, USSD, OPay, Mobile Money, or Card to restore access.'
    : isGrace
      ? `You have ${grace_days_remaining ?? 1} day(s) left in your grace period. Pay now via Bank Transfer, USSD, OPay, Mobile Money, or Card to keep access.`
      : `Your current month ends in ${days_remaining ?? 0} day(s). Renew early using any local payment method or Card.`

  const toneClasses = isExpiredState
    ? 'bg-red-50 border-red-200 text-red-900'
    : 'bg-amber-50 border-amber-200 text-amber-900'

  const subTextClasses = isExpiredState ? 'text-red-700' : 'text-amber-800'

  return (
    <div
      className={`${compact ? 'p-3' : 'p-4'} rounded-lg border ${toneClasses} space-y-2.5`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle
          className={`shrink-0 mt-0.5 ${isExpiredState ? 'text-red-600' : 'text-amber-600'}`}
          size={compact ? 16 : 18}
        />
        <div className="space-y-1">
          <h4 className={`${compact ? 'text-xs' : 'text-sm'} font-bold`}>
            {title}
          </h4>
          <p
            className={`${compact ? 'text-[11px]' : 'text-xs'} ${subTextClasses} leading-relaxed`}
          >
            {description}
          </p>
        </div>
      </div>

      {hasAccess && (
        <button
          type="button"
          onClick={onRenew}
          className="w-full py-2 px-3 rounded-md bg-gray-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCcw size={13} />
          Renew Subscription Now
        </button>
      )}
    </div>
  )
}
