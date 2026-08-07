'use client'

import React from 'react'
import { MonthlyRevenueRecord } from '@services/referral/marketer.service'
import { TrendingUp } from 'lucide-react'

interface MarketerRevenueChartProps {
  data?: MonthlyRevenueRecord[]
  isLoading?: boolean
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function MarketerRevenueChart({
  data = [],
  isLoading = false,
}: MarketerRevenueChartProps) {
  if (isLoading) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.commission_earned_usd, d.commissions_paid_usd)),
    100
  )

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Monthly Revenue Performance
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Earned vs Paid Out Commissions (USD)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-indigo-500 rounded-sm" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">Earned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
            <span className="text-gray-600 dark:text-gray-300 font-medium">Paid</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-gray-400">
          No monthly revenue data available.
        </div>
      ) : (
        <div className="pt-4 pb-2 flex items-end justify-between gap-2 h-48 border-b border-gray-100 dark:border-gray-800">
          {data.map((record, idx) => {
            const earnedHeight = (record.commission_earned_usd / maxVal) * 100
            const paidHeight = (record.commissions_paid_usd / maxVal) * 100
            const monthLabel = MONTH_NAMES[record.month - 1] || `M${record.month}`

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  {/* Earned Bar */}
                  <div
                    style={{ height: `${Math.max(earnedHeight, 4)}%` }}
                    className="w-1/2 bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all relative group/bar"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity font-mono">
                      ${record.commission_earned_usd.toFixed(0)}
                    </div>
                  </div>

                  {/* Paid Bar */}
                  <div
                    style={{ height: `${Math.max(paidHeight, 4)}%` }}
                    className="w-1/2 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all relative group/bar"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity font-mono">
                      ${record.commissions_paid_usd.toFixed(0)}
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {monthLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
