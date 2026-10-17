'use client'

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react'

export type PaymentStatusType = 'successful' | 'cancelled' | 'failed' | null

interface PaymentResultModalProps {
  isOpen: boolean
  onClose: () => void
  status: PaymentStatusType
  courseName?: string
  courseUuid?: string
  orgSlug?: string
  isFreeBypass?: boolean
  onRetryPayment?: () => void
}

export default function PaymentResultModal({
  isOpen,
  onClose,
  status,
  courseName = 'your course',
  courseUuid,
  orgSlug = 'default',
  isFreeBypass = false,
  onRetryPayment,
}: PaymentResultModalProps) {
  const router = useRouter()

  if (!status) return null

  const handleStartLearning = () => {
    onClose()
    if (courseUuid) {
      const cleanCourseUuid = courseUuid.replace(/^course_/, '')
      router.push(`/orgs/${orgSlug}/course/${cleanCourseUuid}`)
    } else {
      router.push(`/orgs/${orgSlug}/courses`)
    }
  }

  const handleGoToDashboard = () => {
    onClose()
    router.push(`/orgs/${orgSlug}/courses`)
  }

  const handleRetry = () => {
    onClose()
    if (onRetryPayment) {
      onRetryPayment()
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-200" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl z-[110] animate-in zoom-in-95 duration-200 border border-gray-100 p-0 focus:outline-none">
          {/* Header Banner */}
          <div
            className={`p-6 text-center relative ${
              status === 'successful'
                ? 'bg-gradient-to-b from-emerald-50/80 to-teal-50/40 border-b border-emerald-100/60'
                : status === 'cancelled'
                  ? 'bg-gradient-to-b from-amber-50/80 to-orange-50/30 border-b border-amber-100/60'
                  : 'bg-gradient-to-b from-rose-50/80 to-red-50/30 border-b border-rose-100/60'
            }`}
          >
            <Dialog.Close className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-500 hover:text-black transition-colors shadow-sm focus:outline-none">
              <X size={16} />
            </Dialog.Close>

            <div className="flex justify-center mb-3">
              {status === 'successful' ? (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-8 ring-emerald-50">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
              ) : status === 'cancelled' ? (
                <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 ring-8 ring-amber-50">
                  <AlertCircle size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 ring-8 ring-rose-50">
                  <AlertTriangle size={32} />
                </div>
              )}
            </div>

            <Dialog.Title className="text-2xl font-black text-gray-900 tracking-tight">
              {status === 'successful'
                ? isFreeBypass
                  ? '🎉 Enrollment Successful!'
                  : '🎉 Payment Successful!'
                : status === 'cancelled'
                  ? 'Payment Cancelled'
                  : 'Payment Unsuccessful'}
            </Dialog.Title>

            <Dialog.Description className="text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
              {status === 'successful' ? (
                <>
                  Your enrollment for{' '}
                  <span className="font-bold text-gray-900">{courseName}</span>{' '}
                  has been confirmed! All lessons, activities, and resources are
                  now fully unlocked.
                </>
              ) : status === 'cancelled' ? (
                <>
                  You have not been charged. Whenever you are ready to start
                  learning, you can resume checkout and enroll anytime.
                </>
              ) : (
                <>
                  The transaction could not be processed by your bank or payment
                  provider. Please check your card balance, verify details, or
                  try another payment method.
                </>
              )}
            </Dialog.Description>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-white space-y-3">
            {status === 'successful' ? (
              <>
                <button
                  onClick={handleStartLearning}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3.5 px-4 rounded-xl font-bold text-[15px] shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  Start Course Now
                  <ArrowRight size={18} />
                </button>
                <button
                  onClick={handleGoToDashboard}
                  className="w-full py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Go to My Dashboard
                </button>
              </>
            ) : status === 'cancelled' ? (
              <>
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white py-3.5 px-4 rounded-xl font-bold text-[15px] shadow-md transition-all hover:scale-[1.02] active:scale-95"
                >
                  Back to Course
                </button>
                {onRetryPayment && (
                  <button
                    onClick={handleRetry}
                    className="w-full py-2.5 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Resume Checkout
                  </button>
                )}
              </>
            ) : (
              <>
                {onRetryPayment && (
                  <button
                    onClick={handleRetry}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3.5 px-4 rounded-xl font-bold text-[15px] shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Retry Payment
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
