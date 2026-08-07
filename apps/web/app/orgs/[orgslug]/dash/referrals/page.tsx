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
  getAdminPartners,
} from '@services/referral/referral.service'
import { getPublicProducts } from '@services/payments/public-products'

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
  Users as UsersIcon,
  Sparkles,
  XCircle,
} from 'lucide-react'
import PartnerStudentModal from '@components/Referrals/PartnerStudentModal'
import { AdminMarketerStats } from '@components/Marketer/AdminMarketerStats'
import { AdminKYCReviewPanel } from '@components/Marketer/AdminKYCReviewPanel'
import {
  adminGetMarketers,
  adminGetMarketerStats,
  adminApproveMarketer,
  adminRejectMarketer,
  adminSuspendMarketer,
  adminReactivateMarketer,
  adminGetKYCQueue,
  adminGetMarketerPayouts,
  adminApproveMarketerPayout,
} from '@services/referral/marketer.service'

type AdminTab = 'leaderboard' | 'partners' | 'payouts' | 'fraud' | 'marketers'

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
  const [selectedPartner, setSelectedPartner] = useState<any>(null)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)

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

  const productsKey = org_id ? ['public-products', org_id] : null
  const { data: productsData } = useSWR(productsKey, ([, org]) =>
    getPublicProducts(org as string)
  )

  const referralCode: ReferralCode | null = codeData?.data ?? null
  const balance: CommissionBalance | null = balanceData?.data ?? null
  const records: CommissionRecord[] = historyData?.data ?? []

  const packageCurrency = useMemo(() => {
    const products = Array.isArray(productsData) ? productsData : []

    const paidProduct = products.find(
      (product: any) =>
        Number(product?.amount ?? 0) > 0 &&
        typeof product?.currency === 'string'
    )

    return (
      paidProduct?.currency ??
      products.find((product: any) => typeof product?.currency === 'string')
        ?.currency ??
      ''
    )
  }, [productsData])

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
  const statsKey = isStrictAdmin && access_token
    ? ['admin-referral-stats', access_token, org_id]
    : null
  const flaggedKey = isStrictAdmin && access_token
    ? ['admin-flagged', access_token, org_id]
    : null
  const pendingPayoutsKey = isStrictAdmin && access_token
    ? ['admin-payouts', access_token, org_id]
    : null
  const partnersKey = isStrictAdmin && access_token
    ? ['admin-partners', access_token, org_id]
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

  const { data: partnersData, isLoading: partnersLoading } = useSWR(
    partnersKey,
    ([, token, org]) => getAdminPartners(token as string, org as string)
  )

  // ─── Marketers Admin State ───
  const [marketerSubTab, setMarketerSubTab] = useState<'applications' | 'kyc' | 'payouts'>('applications')
  const [marketerStatusFilter, setMarketerStatusFilter] = useState<string>('pending_approval')
  const [selectedKycRecord, setSelectedKycRecord] = useState<any | null>(null)

  const mStatsKey = isStrictAdmin && access_token ? ['admin-mktr-stats', access_token, org_id] : null
  const mListKey = isStrictAdmin && access_token ? ['admin-mktr-list', access_token, org_id, marketerStatusFilter] : null
  const mKycKey = isStrictAdmin && access_token ? ['admin-mktr-kyc', access_token, org_id] : null
  const mPayoutsKey = isStrictAdmin && access_token ? ['admin-mktr-payouts', access_token, org_id] : null

  const { data: mStatsData, mutate: mutateMStats } = useSWR(mStatsKey, ([, t, o]) => adminGetMarketerStats(t, o))
  const { data: mListData, mutate: mutateMList } = useSWR(mListKey, ([, t, o, s]) => adminGetMarketers(t, o, s))
  const { data: mKycData, mutate: mutateMKyc } = useSWR(mKycKey, ([, t, o]) => adminGetKYCQueue(t, o))
  const { data: mPayoutsData, mutate: mutateMPayouts } = useSWR(mPayoutsKey, ([, t, o]) => adminGetMarketerPayouts(t, o))

  const mktrStats = mStatsData?.data
  const mktrList = mListData?.data?.items || (Array.isArray(mListData?.data) ? mListData.data : [])
  const kycQueue = mKycData?.data?.items || (Array.isArray(mKycData?.data) ? mKycData.data : [])
  const mktrPayouts = mPayoutsData?.data?.items || (Array.isArray(mPayoutsData?.data) ? mPayoutsData.data : [])

  const stats = statsData?.data
  const flagged = flaggedData?.data
  const pendingPayouts = pendingPayoutsData?.data
  const partners = partnersData?.data?.partners ?? []

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
      key: 'partners',
      label: 'All Partners',
      icon: <UsersIcon size={16} />,
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
    {
      key: 'marketers',
      label: 'Marketers Hub',
      icon: <Sparkles size={16} />,
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
          displayCurrency={packageCurrency || balance?.currency || 'USD'}
          isLoading={balanceLoading}
          onRequestPayout={() => setPayoutOpen(true)}
        />
      </div>

      {/* History */}
      <div className="w-full overflow-hidden">
        <CommissionHistoryList
          records={records}
          displayCurrency={packageCurrency || balance?.currency || 'USD'}
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

              {/* ── All Partners ── */}
              {activeAdminTab === 'partners' && (
                <div className="space-y-4">
                  {partnersLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LucideLoader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : partners.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Partner
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Code
                            </th>
                            <th className="text-center py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Referrals
                            </th>
                            <th className="text-right py-3 px-4 text-gray-400 font-medium text-xs uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {partners.map((p: any) => (
                            <tr
                              key={p.user_id}
                              className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <p className="font-semibold text-gray-800">
                                  {p.username}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {p.email}
                                </p>
                              </td>
                              <td className="py-3 px-4">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-600">
                                  {p.referral_code}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="font-bold text-gray-700">
                                  {p.referral_count}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedPartner({
                                      id: p.user_id,
                                      username: p.username,
                                      email: p.email,
                                    })
                                    setPartnerModalOpen(true)
                                  }}
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  View Students
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 py-8 text-sm">
                      No partners registered
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
              {/* ── Marketers Hub ── */}
              {activeAdminTab === 'marketers' && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <AdminMarketerStats
                    stats={mktrStats}
                    selectedStatus={marketerStatusFilter}
                    onSelectStatus={(status) => {
                      setMarketerStatusFilter(status)
                      setMarketerSubTab('applications')
                    }}
                  />

                  {/* Sub-tabs */}
                  <div className="flex border-b border-gray-100 text-xs font-medium gap-4">
                    <button
                      onClick={() => setMarketerSubTab('applications')}
                      className={`pb-2 border-b-2 transition-colors ${
                        marketerSubTab === 'applications'
                          ? 'border-black text-black font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Applications ({mktrList.length})
                    </button>
                    <button
                      onClick={() => setMarketerSubTab('kyc')}
                      className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                        marketerSubTab === 'kyc'
                          ? 'border-black text-black font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      KYC Queue
                      {kycQueue.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                          {kycQueue.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setMarketerSubTab('payouts')}
                      className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                        marketerSubTab === 'payouts'
                          ? 'border-black text-black font-bold'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Marketer Payouts
                      {mktrPayouts.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold">
                          {mktrPayouts.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Sub-tab 1: Applications */}
                  {marketerSubTab === 'applications' && (
                    <div className="overflow-x-auto">
                      {mktrList.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-xs">No marketers matching filter ({marketerStatusFilter}).</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400">
                              <th className="py-2.5 px-3 text-left">Marketer</th>
                              <th className="py-2.5 px-3 text-left">Phone</th>
                              <th className="py-2.5 px-3 text-left">Code</th>
                              <th className="py-2.5 px-3 text-left">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {mktrList.map((m: any) => {
                              const st = (m.status || '').toUpperCase()
                              return (
                                <tr key={m.id} className="hover:bg-gray-50/50">
                                  <td className="py-3 px-3">
                                    <div className="font-semibold text-gray-800">{m.user_name || m.user_id}</div>
                                    <div className="text-gray-400 text-[11px] font-mono">{m.user_email}</div>
                                  </td>
                                  <td className="py-3 px-3 font-mono text-gray-600">{m.phone_number || 'N/A'}</td>
                                  <td className="py-3 px-3 font-mono font-bold text-gray-700">{m.referral_code || '—'}</td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                        st === 'ACTIVE'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : st === 'PENDING_APPROVAL'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {st}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right space-x-2">
                                    {st === 'PENDING_APPROVAL' && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Approve marketer ${m.user_name || m.id}?`)) {
                                              await adminApproveMarketer(access_token, org_id, m.id)
                                              mutateMList()
                                              mutateMStats()
                                              toast.success('Marketer approved!')
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-medium"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const reason = prompt('Enter rejection reason:')
                                            if (reason) {
                                              await adminRejectMarketer(access_token, org_id, m.id, reason)
                                              mutateMList()
                                              mutateMStats()
                                              toast.success('Marketer rejected')
                                            }
                                          }}
                                          className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    {st === 'ACTIVE' && (
                                      <button
                                        onClick={async () => {
                                          if (confirm(`Suspend marketer ${m.user_name || m.id}?`)) {
                                            await adminSuspendMarketer(access_token, org_id, m.id)
                                            mutateMList()
                                            mutateMStats()
                                            toast.success('Marketer suspended')
                                          }
                                        }}
                                        className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-[11px] font-medium"
                                      >
                                        Suspend
                                      </button>
                                    )}
                                    {st === 'SUSPENDED' && (
                                      <button
                                        onClick={async () => {
                                          if (confirm(`Reactivate marketer ${m.user_name || m.id}?`)) {
                                            await adminReactivateMarketer(access_token, org_id, m.id)
                                            mutateMList()
                                            mutateMStats()
                                            toast.success('Marketer reactivated')
                                          }
                                        }}
                                        className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-[11px] font-medium"
                                      >
                                        Reactivate
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 2: KYC Queue */}
                  {marketerSubTab === 'kyc' && (
                    <div className="overflow-x-auto">
                      {kycQueue.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-xs">No pending KYC document submissions.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400">
                              <th className="py-2.5 px-3 text-left">Marketer</th>
                              <th className="py-2.5 px-3 text-left">Document Type</th>
                              <th className="py-2.5 px-3 text-left">ID Number</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {kycQueue.map((k: any) => (
                              <tr key={k.id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-gray-800">{k.marketer_name || k.user_id}</div>
                                  <div className="text-gray-400 text-[11px] font-mono">{k.marketer_email}</div>
                                </td>
                                <td className="py-3 px-3 font-medium text-gray-700">{k.document_type}</td>
                                <td className="py-3 px-3 font-mono text-gray-600">{k.id_number || 'Provided'}</td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedKycRecord(k)}
                                    className="px-3 py-1 bg-black text-white rounded text-[11px] font-medium hover:bg-gray-800"
                                  >
                                    Review Document
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 3: Marketer Payouts */}
                  {marketerSubTab === 'payouts' && (
                    <div className="overflow-x-auto">
                      {mktrPayouts.length === 0 ? (
                        <p className="text-center text-gray-400 py-8 text-xs">No requested marketer payouts pending approval.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 text-gray-400">
                              <th className="py-2.5 px-3 text-left">Marketer</th>
                              <th className="py-2.5 px-3 text-left">Amount (USD)</th>
                              <th className="py-2.5 px-3 text-left">Currency</th>
                              <th className="py-2.5 px-3 text-left">Status</th>
                              <th className="py-2.5 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {mktrPayouts.map((p: any) => (
                              <tr key={p.id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-3 font-semibold text-gray-800">{p.marketer_name || p.referrer_user_id}</td>
                                <td className="py-3 px-3 font-bold font-mono text-gray-900">${parseFloat(p.total_amount || 0).toFixed(2)}</td>
                                <td className="py-3 px-3 font-mono text-gray-600">{p.currency || 'USD'}</td>
                                <td className="py-3 px-3 font-mono text-amber-600 font-semibold">{p.status}</td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Approve marketer payout of $${p.total_amount}?`)) {
                                        await adminApproveMarketerPayout(access_token, org_id, p.id)
                                        mutateMPayouts()
                                        toast.success('Payout approved for automatic processing!')
                                      }
                                    }}
                                    className="px-3 py-1 bg-emerald-600 text-white rounded text-[11px] font-medium hover:bg-emerald-700"
                                  >
                                    Approve Payout
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedKycRecord && (
        <AdminKYCReviewPanel
          orgSlug={org.orgslug || 'default'}
          kycRecord={selectedKycRecord}
          onClose={() => setSelectedKycRecord(null)}
          onActionComplete={() => {
            mutateMKyc()
            mutateMStats()
          }}
        />
      )}

      <PartnerStudentModal
        open={partnerModalOpen}
        onOpenChange={setPartnerModalOpen}
        partner={selectedPartner}
        access_token={access_token}
        org_id={org_id}
      />
    </div>
  )
}

export default ReferralsPage
