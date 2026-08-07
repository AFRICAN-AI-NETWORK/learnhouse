'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, History, CheckCircle2, XCircle } from 'lucide-react'
import {
  getMarketerDashboard,
  getMarketerPayoutHistory,
  MarketerDashboardData,
  getKYCStatus,
} from '@services/referral/marketer.service'
import { MarketerPayoutPanel } from '@components/Marketer/MarketerPayoutPanel'
import { PaymentMethodForm } from '@components/Marketer/PaymentMethodForm'
import { KYCUploadForm } from '@components/Marketer/KYCUploadForm'

export default function MarketerPayoutsPage() {
  const params = useParams()
  const orgSlug = (params?.orgslug as string) || 'default'

  const [dashboardData, setDashboardData] = useState<MarketerDashboardData | null>(null)
  const [kycData, setKycData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchAllData = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

    const [dashRes, kycRes, historyRes] = await Promise.all([
      getMarketerDashboard(token, orgSlug),
      getKYCStatus(token, orgSlug),
      getMarketerPayoutHistory(token, orgSlug),
    ])

    return { dashRes, kycRes, historyRes }
  }, [orgSlug])

  const reloadData = useCallback(async () => {
    const { dashRes, kycRes, historyRes } = await fetchAllData()
    setIsLoading(false)

    if (dashRes.success && dashRes.data) {
      setDashboardData(dashRes.data)
    }
    if (kycRes.success && kycRes.data) {
      setKycData(kycRes.data)
    }
    if (historyRes.success && historyRes.data) {
      setHistory(Array.isArray(historyRes.data) ? historyRes.data : [])
    }
  }, [fetchAllData])

  useEffect(() => {
    let ignore = false
    fetchAllData().then(({ dashRes, kycRes, historyRes }) => {
      if (ignore) return
      setIsLoading(false)
      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data)
      }
      if (kycRes.success && kycRes.data) {
        setKycData(kycRes.data)
      }
      if (historyRes.success && historyRes.data) {
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : [])
      }
    })
    return () => {
      ignore = true
    }
  }, [fetchAllData])

  const eligibleBalance = dashboardData?.summary?.eligible_for_payout_usd ?? 0.0
  const hasPaymentMethod = Boolean(dashboardData?.completeness_flags?.payment_method_saved)
  const isKYCVerified = Boolean(dashboardData?.completeness_flags?.kyc_verified)
  const kycStatus = kycData?.status || 'UNVERIFIED'
  const rejectionReason = kycData?.rejection_reason

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/orgs/${orgSlug}/marketer`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to Marketer Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Payouts & Payment Preferences
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage your saved payment methods, identity verification, and payout requests.
        </p>
      </div>

      {/* Main Grid Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Request Payout & Payment Method Form */}
        <div className="space-y-8">
          <MarketerPayoutPanel
            orgSlug={orgSlug}
            eligibleBalance={eligibleBalance}
            hasPaymentMethod={hasPaymentMethod}
            isKYCVerified={isKYCVerified}
            onSuccess={reloadData}
          />

          <PaymentMethodForm orgSlug={orgSlug} onSaved={reloadData} />
        </div>

        {/* Right Column: Identity Verification (KYC) */}
        <div className="space-y-8">
          <KYCUploadForm
            orgSlug={orgSlug}
            kycStatus={kycStatus}
            rejectionReason={rejectionReason}
            onSubmitted={reloadData}
          />
        </div>
      </div>

      {/* Bottom Panel: Payout History Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Payout Request History
          </h3>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-6 text-center">
            No payout requests recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount (USD)</th>
                  <th className="py-2.5 px-3">Converted Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Reference / Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {history.map((item: any) => {
                  const status = (item.status || '').toUpperCase()
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                        {item.request_date ? new Date(item.request_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-gray-900 dark:text-white">
                        ${parseFloat(item.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-300">
                        {item.converted_amount
                          ? `${parseFloat(item.converted_amount).toFixed(2)} ${item.currency || ''}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : status === 'APPROVED' || status === 'PROCESSING'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : status === 'FAILED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {status === 'COMPLETED' && <CheckCircle2 size={10} />}
                          {status === 'APPROVED' && <Clock size={10} />}
                          {status === 'FAILED' && <XCircle size={10} />}
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-500 text-[11px]">
                        {item.paystack_transfer_code || item.flutterwave_transfer_id || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
