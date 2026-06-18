'use client'
import React, { useState, useMemo } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'

import ReferralCodeCard from '@components/Referrals/ReferralCodeCard'
import CommissionBalanceCard from '@components/Referrals/CommissionBalanceCard'
import StudentTrackingList from '@components/Affiliation/StudentTrackingList'
import RequestPayoutModal from '@components/Referrals/RequestPayoutModal'

import {
  getMyReferralCode,
  generateReferralCode,
  getCommissionBalance,
  getCommissionHistory,
} from '@services/referral/referral.service'

import type {
  ReferralCode,
  CommissionBalance,
  CommissionRecord,
} from 'types/referral'
import { useOrg } from '@components/Contexts/OrgContext'

import { Handshake, Users } from 'lucide-react'

function AffiliationPage() {
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''

  const org = useOrg() as any
  const org_id = org.id

  // Partner check: role_uuid === 'partner_role'
  const isPartner = useMemo(() => {
    const roles = session?.data?.roles || []
    return roles.some(
      (r: any) =>
        r.org?.id === org_id &&
        (r.role?.role_uuid === 'partner_role' ||
          r.role?.id === 1 ||
          r.role?.id === 2)
    )
  }, [session?.data?.roles, org_id])

  const [payoutOpen, setPayoutOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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

  if (!isPartner && session?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Handshake className="text-slate-300" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Access Restricted
        </h1>
        <p className="text-slate-500 max-w-md">
          This dashboard is reserved for official partners. If you are
          interested in our partnership program, please contact support.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-6 md:px-10 md:py-8 mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Handshake size={32} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="font-black text-2xl md:text-3xl tracking-tight">
                Partner Affiliation
              </h1>
              <p className="text-slate-300 text-sm md:text-base mt-1 max-w-lg">
                Track your impact, manage referrals, and monitor your earnings
                in real-time.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Total Referrals
              </p>
              <p className="text-xl font-black">{records.length}</p>
            </div>
            <div className="bg-emerald-500/20 border border-emerald-500/20 px-4 py-3 rounded-2xl backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                Earned Balance
              </p>
              <p className="text-xl font-black text-emerald-400">
                ${balance?.total_earned?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Actions */}
        <div className="lg:col-span-4 space-y-6">
          <ReferralCodeCard
            referralCode={referralCode}
            isLoading={codeLoading}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />

          <CommissionBalanceCard
            balance={balance}
            displayCurrency="USD"
            isLoading={balanceLoading}
            onRequestPayout={() => setPayoutOpen(true)}
          />

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              Quick Tips
            </h3>
            <ul className="space-y-3">
              {[
                'Share your link on social media',
                'Direct students to our best courses',
                'Commission is $4 per paid enrollment',
                'Payouts are processed weekly',
              ].map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-600">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column - Tracking List */}
        <div className="lg:col-span-8">
          <StudentTrackingList
            records={records}
            isLoading={historyLoading}
            error={historyErr}
          />
        </div>
      </div>

      <RequestPayoutModal
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        balance={balance}
        access_token={access_token}
        org_id={org_id}
      />
    </div>
  )
}

export default AffiliationPage
