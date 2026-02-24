'use client'
import React, { useState, useCallback, useMemo } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'

import ReferralCodeCard from '@components/Referrals/ReferralCodeCard'
import CommissionBalanceCard from '@components/Referrals/CommissionBalanceCard'
import CommissionHistoryList from '@components/Referrals/CommissionHistoryList'
import RequestPayoutModal from '@components/Referrals/RequestPayoutModal'

import {
  getMyReferralCode,
  generateReferralCode,
  getCommissionBalance,
  getCommissionHistory,
  getAdminReferralStats,
  getAdminFlaggedReferrals,
  getAdminPendingPayouts,
  approvePayoutRequest,
  rejectPayoutRequest,
} from '@services/referral/referral.service'

import type {
  ReferralCode,
  CommissionBalance,
  CommissionRecord,
} from 'types/referral'
import { useOrg } from '@components/Contexts/OrgContext'

import toast from 'react-hot-toast'
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  CreditCard,
  Link2,
  LucideLoader2,
  ShieldAlert,
  Trophy,
  XCircle,
} from 'lucide-react'

type AdminTab = 'leaderboard' | 'payouts' | 'fraud'

function ReferralsPage() {
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''

  const org = useOrg() as any
  const org_id = org.id

  // Strict admin check: only role_id 1 (Admin) or 2 (Maintainer)
  const isStrictAdmin = useMemo(() => {
    const roles = session?.data?.roles || []
    return roles.some(
      (r: any) => r.org?.id === org_id && (r.role?.id === 1 || r.role?.id === 2)
    )
  }, [session?.data?.roles, org_id])

  const [payoutOpen, setPayoutOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('leaderboard')

  // ─── User data ───────────────────────────────────────────────
  const codeKey = access_token ? ['referral-code', access_token, org_id] : null
  const balanceKey = access_token
    ? ['referral-balance', access_token, org_id]
    : null
  const historyKey = access_token
    ? ['referral-history', access_token, org_id]
    : null

  const {
    data: codeData,
    isLoading: codeLoading,
    mutate: mutateCode,
  } = useSWR(codeKey, ([, token, org]) =>
    getMyReferralCode(token as string, org as string)
  )

  const { data: balanceData, isLoading: balanceLoading } = useSWR(
    balanceKey,
    ([, token, org]) => getCommissionBalance(token as string, org as string)
  )

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useSWR(historyKey, ([, token, org]) =>
    getCommissionHistory(token as string, org as string)
  )

  const referralCode: ReferralCode | null = codeData?.data ?? null
  const balance: CommissionBalance | null = balanceData?.data ?? null
  const records: CommissionRecord[] = historyData?.data ?? []

  const historyErr = (() => {
    const backendError = historyData?.error
    if (!backendError)
      return historyError ? 'Failed to load history' : undefined
    if (typeof backendError === 'string') return backendError
    if (typeof backendError === 'object') {
      return (backendError as any)?.msg ?? 'Failed to load history'
    }
    return 'Failed to load history'
  })()

  const handleGenerate = async () => {
    if (!access_token) return
    setIsGenerating(true)
    const result = await generateReferralCode(access_token, org_id)
    if (result.success) {
      await mutateCode()
    }
    setIsGenerating(false)
  }

  // ─── Admin data ──────────────────────────────────────────────
  const statsKey = access_token
    ? ['admin-referral-stats', access_token, org_id]
    : null
  const flaggedKey = access_token
    ? ['admin-flagged', access_token, org_id]
    : null
  const pendingPayoutsKey = access_token
    ? ['admin-payouts', access_token, org_id]
    : null

  const { data: statsData, isLoading: statsLoading } = useSWR(
    statsKey,
    ([, token, org]) => getAdminReferralStats(token as string, org as string)
  )

  const { data: flaggedData, isLoading: flaggedLoading } = useSWR(
    flaggedKey,
    ([, token, org]) => getAdminFlaggedReferrals(token as string, org as string)
  )

  const {
    data: pendingPayoutsData,
    isLoading: payoutsLoading,
    mutate: mutatePayouts,
  } = useSWR(pendingPayoutsKey, ([, token, org]) =>
    getAdminPendingPayouts(token as string, org as string)
  )

  const stats = statsData?.data
  const flagged = flaggedData?.data
  const pendingPayouts = pendingPayoutsData?.data

  const handleApprovePayout = useCallback(
    async (payoutId: number) => {
      const res = await approvePayoutRequest(access_token, org_id, payoutId)
      if (res.success) {
        toast.success('Payout approved!')
        mutatePayouts()
      } else {
        toast.error(res.error || 'Failed to approve')
      }
    },
    [access_token, org_id, mutatePayouts]
  )

  const handleRejectPayout = useCallback(
    async (payoutId: number) => {
      const reason = prompt('Enter rejection reason:')
      if (!reason) return
      const res = await rejectPayoutRequest(
        access_token,
        org_id,
        payoutId,
        reason
      )
      if (res.success) {
        toast.success('Payout rejected')
        mutatePayouts()
      } else {
        toast.error(res.error || 'Failed to reject')
      }
    },
    [access_token, org_id, mutatePayouts]
  )

  const adminTabs: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'leaderboard',
      label: 'Leaderboard',
      icon: <Trophy size={16} />,
    },
    {
      key: 'payouts',
      label: 'Payout Approvals',
      icon: <CreditCard size={16} />,
    },
    {
      key: 'fraud',
      label: 'Fraud Review',
      icon: <ShieldAlert size={16} />,
    },
  ]

  return (
    <div className="w-full px-4 py-4 md:px-10 md:py-6 mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white nice-shadow rounded-xl px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-center gap-3">
          <Link2 size={24} className="text-gray-600" />
          <div>
            <h1 className="font-bold text-xl md:text-2xl text-gray-800">
              Referrals
            </h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">
              Earn commissions by referring new users to the platform.
            </p>
          </div>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <ReferralCodeCard
          referralCode={referralCode}
          isLoading={codeLoading}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

        <CommissionBalanceCard
          balance={balance}
          isLoading={balanceLoading}
          onRequestPayout={() => setPayoutOpen(true)}
        />
      </div>

      {/* History */}
      <div className="w-full overflow-hidden">
        <CommissionHistoryList
          records={records}
          isLoading={historyLoading}
          error={historyErr}
        />
      </div>

      <RequestPayoutModal
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        balance={balance}
        access_token={access_token}
        org_id={org_id}
      />

      {/* ══════════════ Admin Section (admin-only) ══════════════ */}
      {isStrictAdmin && (
        <div className="border-t border-gray-200 pt-6 mt-8">
          <div className="bg-white nice-shadow rounded-xl overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h2 className="font-bold text-lg text-gray-800">
                  Admin Dashboard
                </h2>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Manage referral payouts, track performance, and review flagged
                signups.
              </p>
            </div>

            {/* Admin Tabs */}
            <div className="flex border-b border-gray-100">
              {adminTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveAdminTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeAdminTab === tab.key
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.key === 'payouts' &&
                    pendingPayouts?.pending_count > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingPayouts.pending_count}
                      </span>
                    )}
                  {tab.key === 'fraud' && flagged?.flagged_count > 0 && (
                    <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {flagged.flagged_count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 md:p-6">
              {/* ── Leaderboard ── */}
              {activeAdminTab === 'leaderboard' && (
                <div className="space-y-4">
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LucideLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : stats ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-gray-800">
                            {stats.total_referrals}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 font-medium">
                            Total Referrals
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <p className="text-3xl font-black text-gray-800">
                            {stats.total_referrers}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 font-medium">
                            Active Referrers
                          </p>
                        </div>
                      </div>

                      {stats.leaderboard.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                                  Rank
                                </th>
                                <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                                  User
                                </th>
                                <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                                  Referrals
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.leaderboard.map(
                                (entry: any, index: number) => (
                                  <tr
                                    key={entry.user_id}
                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                                  >
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                          index === 0
                                            ? 'bg-amber-100 text-amber-700'
                                            : index === 1
                                              ? 'bg-gray-200 text-gray-600'
                                              : index === 2
                                                ? 'bg-orange-100 text-orange-600'
                                                : 'bg-gray-50 text-gray-400'
                                        }`}
                                      >
                                        {index + 1}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <p className="font-semibold text-gray-800">
                                        {entry.username}
                                      </p>
                                      <p className="text-xs text-gray-400">
                                        {entry.email}
                                      </p>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className="font-bold text-gray-700">
                                        {entry.referral_count}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-center text-gray-400 py-8 text-sm">
                          No referrals yet
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      Unable to load stats
                    </p>
                  )}
                </div>
              )}

              {/* ── Payout Approvals ── */}
              {activeAdminTab === 'payouts' && (
                <div className="space-y-4">
                  {payoutsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LucideLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : pendingPayouts?.payouts?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              User
                            </th>
                            <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Date
                            </th>
                            <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPayouts.payouts.map((p: any) => (
                            <tr
                              key={p.id}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-800">
                                  {p.referrer?.username}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {p.referrer?.email}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="font-bold text-gray-700">
                                  ${p.amount?.toFixed(2)}{' '}
                                  <span className="text-xs text-gray-400">
                                    {p.currency}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">
                                {new Date(p.request_date).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleApprovePayout(p.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
                                  >
                                    <CheckCircle2 size={14} />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectPayout(p.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    <XCircle size={14} />
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        No pending payout requests
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Fraud Review ── */}
              {activeAdminTab === 'fraud' && (
                <div className="space-y-4">
                  {flaggedLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LucideLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : flagged?.records?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Referred User
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Referrer
                            </th>
                            <th className="text-center py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Fraud Score
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              IP Address
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {flagged.records.map((r: any) => (
                            <tr
                              key={r.id}
                              className="border-b border-gray-50 hover:bg-red-50/30 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-800">
                                  {r.referred_user?.username}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {r.referred_user?.email}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-800">
                                  {r.referrer_user?.username}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {r.referrer_user?.email}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    r.fraud_score >= 90
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  <AlertTriangle size={12} />
                                  {r.fraud_score}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                                {r.ip_address}
                              </td>
                              <td className="py-3 px-4 text-gray-500 text-xs">
                                {new Date(r.signup_date).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShieldAlert className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        No flagged signups — all clear!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferralsPage
