'use client'

import React, { useState, useEffect } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2, CreditCard, Tag, Check, CheckCircle2 } from 'lucide-react'
import OpenSignUpComponent from '@/app/auth/signup/OpenSignup'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useCurrency } from '@components/Contexts/CurrencyContext'
import { validateDiscountCode } from '@services/payments/discounts'
import {
  getCheckoutSessionByCourseUuid,
  getStripeProductCheckoutSession,
} from '@services/payments/products'
import { verifyTransaction, checkPaidAccess } from '@services/payments/payments'
import PaymentResultModal, {
  PaymentStatusType,
} from '@components/Objects/Payments/PaymentResultModal'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'

interface ClickToPayButtonProps {
  courseId: string
  productId?: number
  priceAmount: number
  currency?: string
  courseName: string
  planId?: string
  skipDiscountModal?: boolean
  initialDiscountCode?: string
}

export default function ClickToPayButton({
  courseId,
  productId,
  priceAmount,
  currency,
  courseName,
  planId,
  skipDiscountModal,
  initialDiscountCode,
}: ClickToPayButtonProps) {
  const session = useLHSession() as any
  const org = useOrg() as any
  const router = useRouter()
  const { currency: contextCurrency, convertAmount } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false)

  // Payment Result Callback State
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean
    status: PaymentStatusType
    isFreeBypass?: boolean
  }>({
    isOpen: false,
    status: null,
    isFreeBypass: false,
  })

  // Live Course & Access State
  const [resolvedCourse, setResolvedCourse] = useState<{
    id: number
    course_uuid: string
    name: string
  } | null>(null)
  const [hasPaidAccess, setHasPaidAccess] = useState(false)

  const cleanCourseUuid = (
    resolvedCourse?.course_uuid || String(courseId)
  ).replace(/^course_/, '')

  // Check user course access on mount
  useEffect(() => {
    async function fetchCourseAccess() {
      if (!org?.id || !session?.data?.tokens?.access_token) return
      try {
        const res = await checkPaidAccess(
          courseId,
          org.id,
          session.data.tokens.access_token
        )
        if (res?.course) {
          setResolvedCourse(res.course)
        }
        if (res?.has_access) {
          setHasPaidAccess(true)
        }
      } catch (err) {
        // Fallback gracefully
      }
    }
    fetchCourseAccess()
  }, [courseId, org?.id, session?.data?.tokens?.access_token])

  // Check URL parameters for Flutterwave payment callback status
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const statusParam = params.get('status')
    const paymentSuccessParam = params.get('payment_success')
    const txRef = params.get('tx_ref') || params.get('reference')

    if (statusParam === 'successful' || paymentSuccessParam === 'true') {
      const access_token = session?.data?.tokens?.access_token
      if (txRef && org?.id && access_token) {
        verifyTransaction(org.id, txRef, access_token).catch(() => {})
      }
      setHasPaidAccess(true)
      window.history.replaceState({}, '', window.location.pathname)
      setPaymentModalState({
        isOpen: true,
        status: 'successful',
        isFreeBypass: false,
      })
    } else if (statusParam === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname)
      setPaymentModalState({
        isOpen: true,
        status: 'cancelled',
        isFreeBypass: false,
      })
    } else if (statusParam === 'failed') {
      window.history.replaceState({}, '', window.location.pathname)
      setPaymentModalState({
        isOpen: true,
        status: 'failed',
        isFreeBypass: false,
      })
    }
  }, [org?.id, session?.data?.tokens?.access_token])

  // Discount State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)

  // Upsell State
  const [isUpsellSelected, setIsUpsellSelected] = useState(false)

  // Hardcoded upsell price for Career Accelerator (always $20 base)
  const upsellBasePrice = 20

  const baseAmount = convertAmount(priceAmount)
  const upsellAmount = convertAmount(upsellBasePrice)

  let finalAmount = appliedDiscount ? appliedDiscount.final_amount : baseAmount

  const displayFinalAmount = finalAmount + (isUpsellSelected ? upsellAmount : 0)
  const finalCurrency = contextCurrency

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return
    const access_token = session?.data?.tokens?.access_token
    if (!access_token) {
      toast.error('Please login to apply discount')
      return
    }

    setIsValidatingDiscount(true)
    setDiscountError(null)

    try {
      const numericCourseId =
        typeof courseId === 'number' ||
        (typeof courseId === 'string' && /^\d+$/.test(courseId))
          ? parseInt(courseId.toString())
          : undefined
      const stringCourseUuid =
        typeof courseId === 'string' && isNaN(Number(courseId))
          ? courseId
          : undefined

      const result = (await validateDiscountCode(
        org.id,
        discountCode,
        priceAmount,
        access_token,
        numericCourseId,
        productId,
        stringCourseUuid
      )) as any

      const validationData = result?.data ?? result

      if (result && validationData && validationData.valid) {
        const convertedFinalAmount = convertAmount(validationData.final_amount)

        setAppliedDiscount({
          ...validationData,
          code: validationData.code || discountCode.trim(),
          final_amount: convertedFinalAmount,
        })
        toast.success('Discount applied successfully!')
      } else {
        setDiscountError(
          validationData?.error || result?.message || 'Invalid discount code'
        )
      }
    } catch (error) {
      setDiscountError('Failed to validate discount code')
    } finally {
      setIsValidatingDiscount(false)
    }
  }

  const clearDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError(null)
  }

  const triggerPayment = async () => {
    const access_token = session?.data?.tokens?.access_token
    if (!access_token) {
      toast.error('Please login first')
      setIsProcessing(false)
      return
    }

    try {
      let res
      // We will redirect back to the current page upon success or cancellation
      const currentUrl =
        typeof window !== 'undefined' ? window.location.href : ''
      const codeToApply = appliedDiscount
        ? appliedDiscount.code
        : initialDiscountCode || undefined

      if (productId) {
        // If we have an exact product ID (from dashboard/CoursePaidOptions), use the standard checkout
        res = await getStripeProductCheckoutSession(
          org.id,
          productId,
          currentUrl,
          access_token,
          codeToApply,
          undefined,
          finalCurrency
        )
      } else {
        // Otherwise use the uuid based checkout (from landing pages)
        const upsellUuid = isUpsellSelected ? 'career-accelerator' : undefined
        res = await getCheckoutSessionByCourseUuid(
          org.id,
          courseId,
          currentUrl,
          access_token,
          codeToApply,
          upsellUuid,
          finalCurrency
        )
      }

      const checkoutUrl = res?.data?.checkout_url
      if (
        res?.data?.access_code === 'free_bypass' ||
        (res?.success && checkoutUrl?.includes('payment_success=true'))
      ) {
        setIsProcessing(false)
        setIsDiscountModalOpen(false)
        setHasPaidAccess(true)
        if (res?.data?.course_uuid) {
          setResolvedCourse((prev) => ({
            id: prev?.id || 0,
            course_uuid: res.data.course_uuid,
            name: res.data.course_name || prev?.name || courseName,
          }))
        }
        setPaymentModalState({
          isOpen: true,
          status: 'successful',
          isFreeBypass: true,
        })
        return
      }

      if (res?.success && checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }

      const detail: string =
        typeof res?.data?.detail === 'string' ? res.data.detail : ''

      if (res?.status === 404) {
        if (detail.toLowerCase().includes('upsell')) {
          // Only the add-on is unavailable: drop it so the student can still buy the main course.
          setIsUpsellSelected(false)
          setIsDisclaimerAccepted(false)
          toast.error(
            'The Career Accelerator add-on is not available yet. It has been removed from your order, so you can continue with the course only.'
          )
          if (!skipDiscountModal) setIsDiscountModalOpen(true)
        } else {
          toast.error(
            'This course is not available for purchase yet. Please contact support or try again later.'
          )
        }
      } else if (res?.status === 401 || res?.status === 403) {
        toast.error('Your session has expired. Please log in again.')
      } else {
        toast.error(detail || 'Failed to initialize checkout.')
      }
      setIsProcessing(false)
    } catch (e: any) {
      toast.error('Error initiating payment. Please try again.')
      setIsProcessing(false)
    }
  }

  const processPayment = () => {
    setIsProcessing(true)
    setIsModalOpen(false)
    setIsProcessing(false)

    if (skipDiscountModal) {
      setTimeout(() => {
        setIsProcessing(true)
        triggerPayment()
      }, 100)
    } else {
      setIsDiscountModalOpen(true)
    }
  }

  const handleClick = () => {
    if (session.status === 'authenticated') {
      processPayment()
    } else {
      setIsModalOpen(true)
    }
  }

  const handleSignupSuccess = async (userData: any, resData: any) => {
    setIsProcessing(true)
    try {
      await signIn('credentials', {
        email: userData.email,
        password: userData.password,
        redirect: false,
      })
      processPayment()
    } catch (error) {
      toast.error('Failed to log you in automatically.')
      setIsProcessing(false)
    }
  }

  const handleFinalCheckout = () => {
    setIsProcessing(true)
    setIsDiscountModalOpen(false)

    setTimeout(() => {
      triggerPayment()
    }, 100)
  }

  return (
    <>
      {hasPaidAccess ? (
        <div className="w-full flex flex-col items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide shadow-xs">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>✓ Enrolled &amp; Active</span>
          </div>
          <Link
            href={`/orgs/${org?.slug || 'default'}/course/${cleanCourseUuid}`}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/25"
          >
            START LEARNING →
          </Link>
        </div>
      ) : (
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              <CreditCard size={20} />
              CLICK TO PAY →
            </>
          )}
        </button>
      )}

      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl z-50 animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-900">
                  Create Account to Continue
                </Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500">
                  You need an account to access {courseName}
                </Dialog.Description>
              </div>
              <Dialog.Close className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-black transition-colors">
                <X size={18} />
              </Dialog.Close>
            </div>

            <div className="p-6">
              <OpenSignUpComponent onSuccess={handleSignupSuccess} />

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600">
                  Do you already have an account?{' '}
                  <Link
                    href={`/login?orgslug=${org?.slug || 'default'}`}
                    className="font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Login
                  </Link>
                </p>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* DISCOUNT & CHECKOUT MODAL */}
      <Dialog.Root
        open={isDiscountModalOpen}
        onOpenChange={setIsDiscountModalOpen}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-sm overflow-hidden bg-white rounded-3xl shadow-2xl z-[100] animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="bg-neutral-50 p-6 text-center border-b border-gray-100 relative">
              <Dialog.Close className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors shadow-sm">
                <X size={18} />
              </Dialog.Close>
              <Dialog.Title className="text-xl font-bold text-gray-900 mb-1">
                Checkout
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500">
                {courseName}
              </Dialog.Description>

              <div className="mt-4 flex flex-col items-center justify-center">
                <div className="flex items-center">
                  <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: finalCurrency,
                    }).format(displayFinalAmount)}
                  </span>
                  {appliedDiscount && (
                    <span className="ml-3 text-lg text-gray-400 line-through decoration-gray-300">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: finalCurrency,
                      }).format(
                        baseAmount + (isUpsellSelected ? upsellAmount : 0)
                      )}
                    </span>
                  )}
                </div>
                {isUpsellSelected && (
                  <span className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: finalCurrency,
                    }).format(finalAmount)}{' '}
                    / month +{' '}
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: finalCurrency,
                    }).format(upsellAmount)}{' '}
                    one-time
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {!appliedDiscount ? (
                <div className="mb-6 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Tag size={16} className="text-gray-400" />
                    Discount Code (Optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={discountCode}
                      onChange={(e) =>
                        setDiscountCode(e.target.value.toUpperCase())
                      }
                      className="uppercase bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      disabled={isValidatingDiscount}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleApplyDiscount}
                      disabled={!discountCode.trim() || isValidatingDiscount}
                      className="font-semibold px-6 shadow-sm"
                    >
                      {isValidatingDiscount ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  {discountError && (
                    <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1">
                      {discountError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <Check size={16} className="text-emerald-600" />
                      Discount Applied
                    </p>
                    <p className="text-xs text-emerald-600/80 font-medium mt-0.5">
                      {appliedDiscount.code}
                    </p>
                  </div>
                  <button
                    onClick={clearDiscount}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 uppercase tracking-wider px-2 py-1 hover:bg-emerald-100 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {courseId !== 'career-accelerator' && (
                <div className="space-y-4 mb-6">
                  <div
                    className={`p-4 rounded-xl border transition-colors cursor-pointer ${isUpsellSelected ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                    onClick={() => {
                      const newVal = !isUpsellSelected
                      setIsUpsellSelected(newVal)
                      if (!newVal) setIsDisclaimerAccepted(false)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <input
                          type="checkbox"
                          checked={isUpsellSelected}
                          readOnly
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 text-sm">
                            Add Career Accelerator
                          </h4>
                          <span className="font-bold text-amber-700 ml-4">
                            +
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: finalCurrency,
                            }).format(upsellAmount)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 pr-4">
                          Intensive job-ready track. Get prepared and referred
                          to employers globally.
                        </p>
                      </div>
                    </div>
                  </div>

                  {isUpsellSelected && (
                    <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                      <div className="mt-0.5">
                        <input
                          type="checkbox"
                          id="disclaimer-checkbox"
                          checked={isDisclaimerAccepted}
                          onChange={(e) =>
                            setIsDisclaimerAccepted(e.target.checked)
                          }
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </div>
                      <label
                        htmlFor="disclaimer-checkbox"
                        className="text-xs text-red-800 font-medium leading-relaxed cursor-pointer select-none"
                      >
                        <strong>Disclaimer:</strong> If you pay for this course,
                        you will be prepared and referred for job placement.
                        However, the entire hiring process is determined by the
                        employer, not AINA. Even though we do our best to ensure
                        you are fit and have a high chance of getting the job,
                        the final decision rests solely with the employer.
                      </label>
                    </div>
                  )}
                </div>
              )}

              {courseId === 'career-accelerator' && (
                <div className="mb-6 p-4 bg-red-50/50 rounded-xl border border-red-100 flex items-start gap-3">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      id="standalone-disclaimer-checkbox"
                      checked={isDisclaimerAccepted}
                      onChange={(e) =>
                        setIsDisclaimerAccepted(e.target.checked)
                      }
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </div>
                  <label
                    htmlFor="standalone-disclaimer-checkbox"
                    className="text-xs text-red-800 font-medium leading-relaxed cursor-pointer select-none"
                  >
                    <strong>Disclaimer:</strong> If you pay for this course, you
                    will be prepared and referred for job placement. However,
                    the entire hiring process is determined by the employer, not
                    AINA. Even though we do our best to ensure you are fit and
                    have a high chance of getting the job, the final decision
                    rests solely with the employer.
                  </label>
                </div>
              )}

              <Button
                onClick={handleFinalCheckout}
                disabled={
                  isProcessing ||
                  ((courseId === 'career-accelerator' || isUpsellSelected) &&
                    !isDisclaimerAccepted)
                }
                className="w-full h-12 text-[15px] font-bold rounded-xl shadow-[0_4px_14px_0_rgb(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white hover:bg-black"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  <>
                    {isUpsellSelected
                      ? 'Proceed to Payment \u2192'
                      : 'Proceed to Payment \u2192'}
                  </>
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* PAYMENT RESULT MODAL (SUCCESS, CANCELLED, FAILED) */}
      <PaymentResultModal
        isOpen={paymentModalState.isOpen}
        onClose={() =>
          setPaymentModalState((prev) => ({ ...prev, isOpen: false }))
        }
        status={paymentModalState.status}
        courseName={resolvedCourse?.name || courseName}
        courseUuid={cleanCourseUuid}
        orgSlug={org?.slug}
        isFreeBypass={paymentModalState.isFreeBypass}
        onRetryPayment={() => {
          setPaymentModalState((prev) => ({ ...prev, isOpen: false }))
          setIsDiscountModalOpen(true)
        }}
      />
    </>
  )
}
