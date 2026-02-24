'use client'
import React from 'react'
import { DollarSign, Clock, CheckCircle, ArrowRight } from 'lucide-react'
import type { CommissionBalance } from 'types/referral'

interface CommissionBalanceCardProps {
  balance: CommissionBalance | null
  isLoading: boolean
  onRequestPayout: () => void
}

function StatBox({
  label,
  value,
  currency,
  icon,
  highlight,
}: {
  label: string
  value: number
  currency: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  const safeValue = Number(value) >= 1 ? Number(value) : 0
  return (
    <div
      className={`flex flex-col gap-1 p-4 rounded-lg border ${highlight ? 'bg-black text-white border-black' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-70">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency || 'USD',
        }).format(safeValue)}
      </div>
    </div>
  )
}

function CommissionBalanceCard({
  balance,
  isLoading,
  onRequestPayout,
}: CommissionBalanceCardProps) {
  const canRequestPayout = (balance?.eligible_balance ?? 0) >= 1

  return (
    <div className="bg-white rounded-xl nice-shadow px-6 py-5">
      <div className="flex flex-col bg-gray-50 -space-y-1 px-4 py-3 rounded-md mb-4">
        <h2 className="font-bold text-lg text-gray-800">Commission Balance</h2>
        <p className="text-gray-500 text-sm">
          Track your earnings and request payouts when eligible.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
            <div className="animate-pulse h-20 bg-gray-100 rounded-lg" />
          </div>
        </div>
      ) : balance ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              label="Total Earned"
              value={balance.total_earned}
              currency={balance.currency}
              icon={<DollarSign size={12} />}
            />
            <StatBox
              label="Eligible Balance"
              value={balance.eligible_balance}
              currency={balance.currency}
              icon={<CheckCircle size={12} />}
              highlight
            />
            <StatBox
              label="Pending"
              value={balance.pending_balance}
              currency={balance.currency}
              icon={<Clock size={12} />}
            />
          </div>

          <button
            onClick={onRequestPayout}
            disabled={!canRequestPayout}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
              canRequestPayout
                ? 'bg-black text-white hover:bg-gray-800 active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowRight size={16} />
            Request Payout
            {!canRequestPayout && (
              <span className="text-xs font-normal opacity-70">
                (minimum $1 required)
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm">
          Balance information unavailable
        </div>
      )}
    </div>
  )
}

export default CommissionBalanceCard
