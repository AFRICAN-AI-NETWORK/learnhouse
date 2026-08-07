'use client'

import React, { useState } from 'react'
import { Wallet, AlertCircle, ArrowUpRight, CheckCircle2, Lock } from 'lucide-react'
import {
  requestMarketerPayout,
  MarketerError,
} from '@services/referral/marketer.service'

interface MarketerPayoutPanelProps {
  orgSlug: string
  eligibleBalance?: number
  hasPaymentMethod?: boolean
  isKYCVerified?: boolean
  onSuccess?: () => void
}

export function MarketerPayoutPanel({
  orgSlug,
  eligibleBalance = 0.0,
  hasPaymentMethod = false,
  isKYCVerified = false,
  onSuccess,
}: MarketerPayoutPanelProps) {
  const [amount, setAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const minPayout = 7.7
  const isBalanceEligible = eligibleBalance >= minPayout
  const isAllowedToRequest = isBalanceEligible && hasPaymentMethod && isKYCVerified

  const handleMaxClick = () => {
    setAmount(eligibleBalance.toFixed(2))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < minPayout) {
      setError(`Minimum payout amount is $${minPayout.toFixed(2)} USD.`)
      return
    }

    if (numAmount > eligibleBalance) {
      setError(`Amount exceeds your available balance of $${eligibleBalance.toFixed(2)} USD.`)
      return
    }

    setIsLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const res = await requestMarketerPayout(token, orgSlug, numAmount)
    setIsLoading(false)

    if (res.success) {
      setSuccessMsg('Your payout request has been submitted and is pending admin approval!')
      setAmount('')
      if (onSuccess) onSuccess()
    } else if (res.error) {
      if (res.error.error_code === 'MKTR_303') {
        setError('A payout is already in progress — please wait for it to complete.')
      } else if (res.error.error_code === 'MKTR_301') {
        setError(`Minimum payout amount is $${minPayout.toFixed(2)} USD.`)
      } else if (res.error.error_code === 'MKTR_302') {
        setError('Requested amount exceeds your available balance.')
      } else {
        setError(res.error.message)
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Wallet size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Request Payout
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Withdraw your eligible commission balance.
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-xs text-gray-500 dark:text-gray-400">Available</span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            ${eligibleBalance.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Prerequisite Warnings */}
      {!isAllowedToRequest && (
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs space-y-1.5 text-amber-900 dark:text-amber-300">
          <div className="font-semibold flex items-center gap-1.5">
            <Lock size={14} className="shrink-0" />
            Payout Requirements Checklist:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-400">
            {!isBalanceEligible && (
              <li>Minimum eligible balance is ${minPayout.toFixed(2)} USD (current: ${eligibleBalance.toFixed(2)})</li>
            )}
            {!hasPaymentMethod && <li>Saved payment method required</li>}
            {!isKYCVerified && <li>Identity (KYC) verification required</li>}
          </ul>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Payout Amount (USD)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">$</span>
              <input
                type="number"
                step="0.01"
                min={minPayout}
                max={eligibleBalance}
                value={amount}
                disabled={!isAllowedToRequest || isLoading}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none font-mono disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={!isAllowedToRequest || isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              MAX
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isAllowedToRequest || isLoading || !amount}
          className="w-full py-3 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isLoading ? (
            'Submitting Payout Request...'
          ) : (
            <>
              Request Payout
              <ArrowUpRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
