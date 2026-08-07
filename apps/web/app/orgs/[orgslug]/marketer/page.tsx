'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Users,
  DollarSign,
} from 'lucide-react'
import {
  getMarketerDashboard,
  MarketerDashboardData,
} from '@services/referral/marketer.service'
import { MarketerSummaryCards } from '@components/Marketer/MarketerSummaryCards'
import { ReferralCodeCard } from '@components/Marketer/ReferralCodeCard'

export default function MarketerDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = (params?.orgslug as string) || 'default'

  const [data, setData] = useState<MarketerDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true)
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

      const res = await getMarketerDashboard(token, orgSlug)
      setIsLoading(false)

      if (res.success && res.data) {
        setData(res.data)
      } else if (res.error) {
        if (res.error.error_code === 'MKTR_002') {
          // User is not registered as a marketer yet
          router.push(`/orgs/${orgSlug}/marketer/register`)
        } else {
          setError(res.error.message)
        }
      }
    }

    loadDashboard()
  }, [orgSlug, router])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <XCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Failed to load Marketer Dashboard
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    )
  }

  const status = data?.profile?.status?.toUpperCase()

  // 1. Holding Screen: PENDING_APPROVAL
  if (status === 'PENDING_APPROVAL') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Clock size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Application Under Review
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Your application to become a LearnHouse Marketer is currently being reviewed by our administrators.
          </p>
        </div>
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          You will receive an email notification as soon as your account is approved.
        </div>
      </div>
    )
  }

  // 2. Holding Screen: REJECTED
  if (status === 'REJECTED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <XCircle size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Application Declined
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Unfortunately, your marketer application was not approved at this time.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="mailto:support@learnhouse.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    )
  }

  // 3. Holding Screen: SUSPENDED
  if (status === 'SUSPENDED') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account Suspended
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Your marketer account has been temporarily suspended. Your referral code is currently inactive.
          </p>
        </div>
        <div className="pt-2">
          <a
            href="mailto:support@learnhouse.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    )
  }

  // 4. Full ACTIVE Dashboard
  const flags = data?.completeness_flags
  const missingFlags = [
    !flags?.payment_method_saved && {
      label: 'Add payment method',
      href: `/orgs/${orgSlug}/marketer/payouts`,
    },
    !flags?.kyc_verified && {
      label: 'Complete KYC verification',
      href: `/orgs/${orgSlug}/marketer/payouts`,
    },
    !flags?.country_set && {
      label: 'Set your country',
      href: `/orgs/${orgSlug}/profile`,
    },
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Marketer Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your student referrals, commissions, and payout status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgSlug}/marketer/students`}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <Users size={14} />
            View Students
          </Link>
          <Link
            href={`/orgs/${orgSlug}/marketer/payouts`}
            className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
          >
            <DollarSign size={14} />
            Payouts & Payment Methods
          </Link>
        </div>
      </div>

      {/* Completeness Banner */}
      {missingFlags.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-medium">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Complete your marketer profile to unlock payouts:</span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {missingFlags.map((item, idx) => (
              <Link
                key={idx}
                href={item.href}
                className="px-3 py-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
              >
                {item.label}
                <ChevronRight size={12} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <MarketerSummaryCards summary={data?.summary} />

      {/* Referral Code Bar */}
      <ReferralCodeCard
        code={data?.profile?.referral_code?.code}
        referralLink={
          data?.profile?.referral_code?.code
            ? `${typeof window !== 'undefined' ? window.location.origin : ''}?ref=${data.profile.referral_code.code}`
            : ''
        }
        commissionRate={data?.profile?.commission_rate_usd || 7.7}
      />
    </div>
  )
}
