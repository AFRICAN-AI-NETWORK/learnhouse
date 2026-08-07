'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, TrendingUp, Calendar } from 'lucide-react'
import {
  getMarketerMonthlyRevenue,
  MonthlyRevenueRecord,
} from '@services/referral/marketer.service'
import { MarketerRevenueChart } from '@components/Marketer/MarketerRevenueChart'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function MarketerRevenuePage() {
  const params = useParams()
  const orgSlug = (params?.orgslug as string) || 'default'

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [revenueRecords, setRevenueRecords] = useState<MonthlyRevenueRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadRevenue() {
      setIsLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const res = await getMarketerMonthlyRevenue(token, orgSlug, selectedYear)
      setIsLoading(false)

      if (res.success && res.data) {
        setRevenueRecords(Array.isArray(res.data) ? res.data : [])
      }
    }

    loadRevenue()
  }, [orgSlug, selectedYear])

  const handleExportCSV = () => {
    if (revenueRecords.length === 0) return

    const headers = ['Month', 'Year', 'Courses Sold', 'Earned USD', 'Eligible USD', 'Paid USD']
    const rows = revenueRecords.map((r) => [
      MONTH_NAMES[r.month - 1] || r.month,
      r.year,
      r.courses_sold,
      r.commission_earned_usd.toFixed(2),
      r.commissions_eligible_usd.toFixed(2),
      r.commissions_paid_usd.toFixed(2),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `marketer_revenue_${selectedYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalEarned = revenueRecords.reduce((acc, r) => acc + r.commission_earned_usd, 0)
  const totalPaid = revenueRecords.reduce((acc, r) => acc + r.commissions_paid_usd, 0)
  const totalCourses = revenueRecords.reduce((acc, r) => acc + r.courses_sold, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href={`/orgs/${orgSlug}/marketer`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to Marketer Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={24} className="text-indigo-600" />
              Monthly Revenue Analysis
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Detailed month-by-month breakdown of earned and paid out commissions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-gray-900 dark:text-white font-medium outline-none"
              >
                {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              disabled={revenueRecords.length === 0}
              className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Revenue Chart */}
      <MarketerRevenueChart data={revenueRecords} isLoading={isLoading} />

      {/* Summary Totals Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs text-gray-500 block">Total Courses Sold ({selectedYear})</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{totalCourses}</span>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs text-gray-500 block">Total Earned ({selectedYear})</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">${totalEarned.toFixed(2)}</span>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm text-center">
          <span className="text-xs text-gray-500 block">Total Paid Out ({selectedYear})</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalPaid.toFixed(2)}</span>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
          Monthly Ledger Table ({selectedYear})
        </h3>

        {revenueRecords.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No revenue data for {selectedYear}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-3">Courses Sold</th>
                  <th className="py-2.5 px-3">Earned (USD)</th>
                  <th className="py-2.5 px-3">Eligible (USD)</th>
                  <th className="py-2.5 px-3">Paid Out (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {revenueRecords.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">
                      {MONTH_NAMES[r.month - 1] || r.month}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300">
                      {r.courses_sold}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      ${r.commission_earned_usd.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300">
                      ${r.commissions_eligible_usd.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      ${r.commissions_paid_usd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
