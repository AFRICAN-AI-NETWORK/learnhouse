'use client'
import React, { useState } from 'react'
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
} from '@services/referral/referral.service'

import type {
  ReferralCode,
  CommissionBalance,
  CommissionRecord,
} from 'types/referral'
import { useOrg } from '@components/Contexts/OrgContext'

function ReferralsPage() {
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''

  const org = useOrg() as any
  const org_id = org.id

  const [payoutOpen, setPayoutOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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

    // Safely extract backend validation message
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
      // Proper SWR cache revalidation
      await mutateCode()
    }

    setIsGenerating(false)
  }

  return (
    <div className="w-full px-4 py-4 md:px-10 md:py-6 mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white nice-shadow rounded-xl px-4 py-4 md:px-6 md:py-5">
        <h1 className="font-bold text-xl md:text-2xl text-gray-800">
          Referrals
        </h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">
          Earn commissions by referring new users to the platform.
        </p>
      </div>

      {/* Cards Grid */}
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
    </div>
  )
}

export default ReferralsPage
