'use client'

import React, { useState } from 'react'
import { X, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'
import {
  adminApproveKYC,
  adminRejectKYC,
} from '@services/referral/marketer.service'
import NextImage from 'next/image'

interface AdminKYCReviewPanelProps {
  orgSlug: string
  kycRecord: any | null
  onClose: () => void
  onActionComplete: () => void
}

export function AdminKYCReviewPanel({
  orgSlug,
  kycRecord,
  onClose,
  onActionComplete,
}: AdminKYCReviewPanelProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!kycRecord) return null

  const handleApprove = async () => {
    if (!confirm(`Approve KYC verification for ${kycRecord.marketer_name}?`))
      return
    setIsSubmitting(true)
    setError(null)
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const res = await adminApproveKYC(token, orgSlug, kycRecord.id)
    setIsSubmitting(false)

    if (res.success) {
      onActionComplete()
      onClose()
    } else if (res.error) {
      setError(res.error.message)
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectReason.trim()) return

    setIsSubmitting(true)
    setError(null)
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const res = await adminRejectKYC(token, orgSlug, kycRecord.id, rejectReason)
    setIsSubmitting(false)

    if (res.success) {
      onActionComplete()
      onClose()
    } else if (res.error) {
      setError(res.error.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 flex justify-end">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl overflow-y-auto flex flex-col justify-between p-6 space-y-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <ShieldCheck size={20} className="text-indigo-600" />
                Review Identity (KYC)
              </h3>
              <p className="text-xs text-gray-500">
                Submitted by {kycRecord.marketer_name || 'Marketer'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Details */}
          <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Marketer Email:</span>
              <span className="font-medium font-mono text-gray-900 dark:text-white">
                {kycRecord.marketer_email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Document Type:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {kycRecord.document_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ID Number:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {kycRecord.id_number || 'Provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Submitted Date:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {kycRecord.creation_date
                  ? new Date(kycRecord.creation_date).toLocaleString()
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Document Images */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Uploaded Document Files
            </h4>

            {/* Front Image */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 block">
                Front Image
              </span>
              {kycRecord.front_image_url ? (
                <NextImage
                  src={kycRecord.front_image_url}
                  alt="Front Document"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100"
                  width={800}
                  height={800}
                />
              ) : (
                <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400">
                  Image expired, reopen panel to refresh
                </div>
              )}
            </div>

            {/* Back Image (if present) */}
            {kycRecord.back_image_url && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-gray-500 block">
                  Back Image
                </span>
                <NextImage
                  src={kycRecord.back_image_url}
                  alt="Back Document"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100"
                  width={800}
                  height={800}
                />
              </div>
            )}

            {/* Selfie Image */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-500 block">
                Selfie with Document
              </span>
              {kycRecord.selfie_image_url ? (
                <NextImage
                  src={kycRecord.selfie_image_url}
                  alt="Selfie"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100"
                  width={800}
                  height={800}
                />
              ) : (
                <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400">
                  Image expired, reopen panel to refresh
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {showRejectForm ? (
            <form onSubmit={handleReject} className="space-y-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Reason for Rejection (sent to marketer via email)
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Document image is blurry or unreadable..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle size={16} />
                Reject Verification
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                Approve Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
