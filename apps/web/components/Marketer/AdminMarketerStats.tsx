'use client'

import React from 'react'
import { Users, CheckCircle2, Clock, DollarSign } from 'lucide-react'

interface AdminMarketerStatsProps {
  stats?: {
    total_marketers: number
    active_marketers: number
    pending_approval: number
    total_paid_usd: number
  }
  selectedStatus?: string
  onSelectStatus?: (status: string) => void
  isLoading?: boolean
}

export function AdminMarketerStats({
  stats,
  selectedStatus = 'all',
  onSelectStatus,
  isLoading = false,
}: AdminMarketerStatsProps) {
  if (isLoading) {
    return <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  const items = [
    {
      id: 'all',
      label: 'Total Marketers',
      value: stats?.total_marketers ?? 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      id: 'active',
      label: 'Active Marketers',
      value: stats?.active_marketers ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      id: 'pending_approval',
      label: 'Pending Approval',
      value: stats?.pending_approval ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
      badge: (stats?.pending_approval ?? 0) > 0 ? `${stats?.pending_approval} Pending` : undefined,
    },
    {
      id: 'paid',
      label: 'Total Paid Out',
      value: `$${(stats?.total_paid_usd ?? 0.0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon
        const isSelected = selectedStatus === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectStatus && onSelectStatus(item.id)}
            className={`bg-white dark:bg-gray-900 border rounded-xl p-4 text-left shadow-sm transition-all ${
              isSelected
                ? 'border-black dark:border-white ring-2 ring-black/5 dark:ring-white/10'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
              <div className={`p-2 rounded-lg ${item.color}`}>
                <Icon size={16} />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {item.value}
              </span>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
