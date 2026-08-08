'use client'
import React, { useState } from 'react'
import { Copy, Check, TrendingUp, Link2 } from 'lucide-react'

interface ReferralCodeCardProps {
  code?: string
  referralLink?: string
  commissionRate?: number
  isLoading?: boolean
}

export function ReferralCodeCard({
  code = '',
  referralLink = '',
  commissionRate = 7.7,
  isLoading = false,
}: ReferralCodeCardProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const handleCopyCode = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleCopyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleShareTwitter = () => {
    if (!referralLink) return
    const text = encodeURIComponent(
      `Join me on LearnHouse! Use my referral link to get started: ${referralLink}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleShareWhatsApp = () => {
    if (!referralLink) return
    const text = encodeURIComponent(
      `Join me on LearnHouse! Use my referral link to get started: ${referralLink}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="h-44 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Your Marketer Referral Code
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Earn ${commissionRate.toFixed(2)} USD for every student who purchases a course using your code.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Code Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="flex-1 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
            <span className="font-mono font-bold text-lg tracking-widest text-gray-900 dark:text-white">
              {code || 'N/A'}
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            disabled={!code}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {copiedCode ? <Check size={16} /> : <Copy size={16} />}
            {copiedCode ? 'Copied Code' : 'Copy Code'}
          </button>
        </div>

        {/* Link Bar & Social Share */}
        {referralLink && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg px-3.5 py-2.5 overflow-hidden">
              <Link2 size={16} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-600 dark:text-gray-300 font-mono truncate">
                {referralLink}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink ? 'Link Copied' : 'Copy Link'}
              </button>

              <button
                onClick={handleShareTwitter}
                className="px-3 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-medium transition-colors"
                title="Share on X / Twitter"
              >
                X
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                title="Share on WhatsApp"
              >
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
