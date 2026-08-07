'use client'
import React from 'react'
import { Users, BookOpen, DollarSign, Wallet } from 'lucide-react'

interface SummaryData {
  total_students: number
  total_courses_sold: number
  total_earned_usd: number
  eligible_for_payout_usd: number
  pending_usd?: number
  total_paid_usd?: number
}

interface MarketerSummaryCardsProps {
  summary?: SummaryData
  isLoading?: boolean
}

export function MarketerSummaryCards({
  summary,
  isLoading = false,
}: MarketerSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    )
  }

  const students = summary?.total_students ?? 0
  const courses = summary?.total_courses_sold ?? 0
  const earned = summary?.total_earned_usd ?? 0.0
  const eligible = summary?.eligible_for_payout_usd ?? 0.0

  const isEligibleHighlight = eligible >= 7.7

  const cards = [
    {
      title: 'Students Referred',
      value: students.toLocaleString(),
      icon: Users,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      title: 'Courses Sold',
      value: courses.toLocaleString(),
      icon: BookOpen,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400',
    },
    {
      title: 'Total Earned',
      value: `$${earned.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      title: 'Available for Payout',
      value: `$${eligible.toFixed(2)}`,
      icon: Wallet,
      color: isEligibleHighlight
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-500/20'
        : 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
      badge: isEligibleHighlight ? 'Eligible' : 'Min $7.70',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div
            key={idx}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-lg ${card.color}`}>
                <Icon size={18} />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </span>
              {card.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isEligibleHighlight
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {card.badge}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
