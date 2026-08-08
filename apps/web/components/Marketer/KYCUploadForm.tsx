'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  Clock,
  ShieldCheck,
  UserCheck,
  Camera,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { uploadKYCDocuments } from '@services/referral/marketer.service'

interface KYCUploadFormProps {
  orgSlug: string
  kycStatus?: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED'
  rejectionReason?: string
  onSubmitted?: () => void
}

export function KYCUploadForm({
  orgSlug,
  kycStatus = 'UNVERIFIED',
  rejectionReason,
  onSubmitted,
}: KYCUploadFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [docType, setDocType] = useState<
    'NATIONAL_ID' | 'PASSPORT' | 'DRIVERS_LICENSE'
  >('NATIONAL_ID')

  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [selfieImage, setSelfieImage] = useState<File | null>(null)
  const [idNumber, setIdNumber] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Status Banner rendering if already submitted/verified
  if (kycStatus === 'VERIFIED') {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-5 flex items-center gap-3">
        <ShieldCheck
          size={24}
          className="text-emerald-600 dark:text-emerald-400 shrink-0"
        />
        <div>
          <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
            Identity Verified
          </h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Your KYC document has been approved by admins. You are eligible for
            automated payouts.
          </p>
        </div>
      </div>
    )
  }

  if (kycStatus === 'PENDING_REVIEW' || isSuccess) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-5 flex items-center gap-3">
        <Clock
          size={24}
          className="text-amber-600 dark:text-amber-400 shrink-0 animate-pulse"
        />
        <div>
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
            Verification in Progress
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Your identity documents have been submitted and are under review.
            You'll receive an email update once verified.
          </p>
        </div>
      </div>
    )
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit.')
        return
      }
      setter(file)
      if (error) setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!frontImage || !selfieImage || !idNumber || !confirmed) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('document_type', docType)
    formData.append('id_number', idNumber)
    formData.append('front_image', frontImage)
    if (docType !== 'PASSPORT' && backImage) {
      formData.append('back_image', backImage)
    }
    formData.append('selfie_image', selfieImage)

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const res = await uploadKYCDocuments(token, orgSlug, formData)
    setIsLoading(false)

    if (res.success) {
      setIsSuccess(true)
      if (onSubmitted) onSubmitted()
    } else if (res.error) {
      if (res.error.error_code === 'MKTR_201') {
        setError(
          'This ID number is already registered to another marketer account.'
        )
      } else if (res.error.error_code === 'MKTR_202') {
        setError(
          'You have reached the maximum submission attempts. Please contact support.'
        )
      } else {
        setError(res.error.message)
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <UserCheck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              Identity Verification (KYC)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Submit your ID document to unlock automated payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span
            className={
              step >= 1 ? 'font-bold text-gray-900 dark:text-white' : ''
            }
          >
            1
          </span>{' '}
          /
          <span
            className={
              step >= 2 ? 'font-bold text-gray-900 dark:text-white' : ''
            }
          >
            2
          </span>{' '}
          /
          <span
            className={
              step >= 3 ? 'font-bold text-gray-900 dark:text-white' : ''
            }
          >
            3
          </span>
        </div>
      </div>

      {kycStatus === 'REJECTED' && rejectionReason && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
          <strong className="block font-semibold">
            Previous Submission Rejected:
          </strong>
          {rejectionReason}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* STEP 1: Select Document Type & Upload Front/Back */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
              >
                <option value="NATIONAL_ID">National Identity Card</option>
                <option value="DRIVERS_LICENSE">Driver's License</option>
                <option value="PASSPORT">International Passport</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Front Image of Document (Required)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => handleFileChange(e, setFrontImage)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {frontImage && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  Selected: {frontImage.name}
                </p>
              )}
            </div>

            {docType !== 'PASSPORT' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Back Image of Document (Required)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => handleFileChange(e, setBackImage)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {backImage && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">
                    Selected: {backImage.name}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!frontImage || (docType !== 'PASSPORT' && !backImage)}
              onClick={() => setStep(2)}
              className="w-full py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              Next: Selfie Upload
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* STEP 2: Upload Selfie */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-lg text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Camera size={14} />
                Selfie Verification Instruction:
              </span>
              <p>
                Hold your document next to your face and take a clear photo.
                Ensure face and ID details are clearly visible.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selfie Photo (Required)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => handleFileChange(e, setSelfieImage)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {selfieImage && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  Selected: {selfieImage.name}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                type="button"
                disabled={!selfieImage}
                onClick={() => setStep(3)}
                className="flex-1 py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                Next: ID Number & Review
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ID Number & Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Government ID Number
              </label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="1234567890"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none font-mono"
              />
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-xs space-y-1">
              <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                Submission Summary:
              </span>
              <p className="text-gray-500">Document Type: {docType}</p>
              <p className="text-gray-500">Front Image: {frontImage?.name}</p>
              <p className="text-gray-500">Selfie Photo: {selfieImage?.name}</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-xs text-gray-600 dark:text-gray-300">
                I confirm that all uploaded documents are authentic and belong
                to me.
              </span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !idNumber || !confirmed}
                className="flex-1 py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isLoading
                  ? 'Submitting KYC Documents...'
                  : 'Submit Verification Documents'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
