'use client'
import React, { useState } from 'react'
import { Copy, Check, Share2, Zap, Link2 } from 'lucide-react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import type { ReferralCode } from 'types/referral'

interface ReferralCodeCardProps {
  referralCode: ReferralCode | null
  isLoading: boolean
  onGenerate: () => Promise<void>
  isGenerating: boolean
}

function ReferralCodeCard({
  referralCode,
  isLoading,
  onGenerate,
  isGenerating,
}: ReferralCodeCardProps) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyCode = async () => {
    if (!referralCode?.code) return
    try {
      await navigator.clipboard.writeText(referralCode.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleCopyLink = async () => {
    if (!referralCode?.referral_link) return
    try {
      await navigator.clipboard.writeText(referralCode.referral_link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleShareTwitter = () => {
    if (!referralCode?.referral_link) return
    const text = encodeURIComponent(
      `Join me on this platform! Use my referral link: ${referralCode.referral_link}`
    )
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleShareWhatsApp = () => {
    if (!referralCode?.referral_link) return
    const text = encodeURIComponent(
      `Join me on this platform! Use my referral link: ${referralCode.referral_link}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="bg-white rounded-xl nice-shadow px-6 py-5">
      <div className="flex flex-col bg-gray-50 -space-y-1 px-4 py-3 rounded-md mb-4">
        <h2 className="font-bold text-lg text-gray-800">Your Referral Code</h2>
        <p className="text-gray-500 text-sm">
          Share your code and earn commissions on every successful referral.
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-16 bg-gray-100 rounded-lg" />
      ) : referralCode ? (
        <div className="space-y-4">
          {/* Code display */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <span className="font-mono font-bold text-xl tracking-widest text-gray-800">
                {referralCode.code}
              </span>
              <Badge variant="outline" className="text-xs">
                {referralCode.total_referrals} referral
                {referralCode.total_referrals !== 1 ? 's' : ''}
              </Badge>
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-2 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Referral link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 overflow-hidden">
              <Link2 size={14} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-500 truncate">
                {referralCode.referral_link}
              </span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
            >
              {linkCopied ? <Check size={14} /> : <Copy size={14} />}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Share2 size={13} /> Share via:
            </span>
            <button
              onClick={handleShareTwitter}
              className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              X / Twitter
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              WhatsApp
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-gray-500 text-sm">
            You don&apos;t have a referral code yet. Generate one to start
            earning.
          </p>
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 mx-auto"
          >
            <Zap size={16} />
            {isGenerating ? 'Generating…' : 'Generate My Code'}
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReferralCodeCard
