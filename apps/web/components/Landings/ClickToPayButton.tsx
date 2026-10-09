'use client'

import React, { useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2, CreditCard, Tag, Check } from 'lucide-react'
import OpenSignUpComponent from '@/app/auth/signup/OpenSignup'
import { useFlutterwave } from 'flutterwave-react-v3'
import { usePaystackPayment } from 'react-paystack'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useCurrency } from '@components/Contexts/CurrencyContext'
import { validateDiscountCode } from '@services/payments/discounts'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'

interface ClickToPayButtonProps {
  courseId: string
  priceAmount: number
  currency?: string // made optional since we use context now
  courseName: string
  planId?: string // Optional Flutterwave Plan ID for subscriptions
  skipDiscountModal?: boolean // Optional prop to skip the discount modal
}

export default function ClickToPayButton({
  courseId,
  priceAmount,
  currency, // we can ignore this now
  courseName,
  planId,
  skipDiscountModal,
}: ClickToPayButtonProps) {
  const session = useLHSession() as any
  const org = useOrg() as any
  const router = useRouter()
  const { currency: contextCurrency, convertAmount } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false)

  // Discount State
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)

  const fwPublicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || ''
  const psPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || ''

  // Track email/name dynamically for guest checkout flow
  const [dynamicEmail, setDynamicEmail] = useState('')
  const [dynamicName, setDynamicName] = useState('')

  // Upsell State
  const [isUpsellSelected, setIsUpsellSelected] = useState(false)
  const [isPendingSecondPayment, setIsPendingSecondPayment] = useState(false)

  // Hardcoded upsell price for Career Accelerator (always $20 base)
  const upsellBasePrice = 20

  // Fix impure Date.now() call during render
  const [txRef, setTxRef] = useState(() => Date.now().toString())

  React.useEffect(() => {
    if (session?.status === 'authenticated' && session?.data?.user?.email) {
      setDynamicEmail(session.data.user.email)
      setDynamicName(session.data.username || session.data.user.name || '')
    }
  }, [session])

  const baseAmount = convertAmount(priceAmount)
  const upsellAmount = convertAmount(upsellBasePrice)

  let finalAmount = appliedDiscount
    ? appliedDiscount.final_amount // the backend returns the final amount
    : baseAmount

  // We only add upsell amount for display in the modal.
  // The actual fwConfig will use different amounts depending on the phase.
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
      // Validate without productId by using orgId, code, and amount
      const result = (await validateDiscountCode(
        org.id,
        discountCode,
        priceAmount,
        access_token
      )) as any

      if (result && result.data && result.data.valid) {
        // Convert the backend final_amount to the selected currency
        const convertedFinalAmount = convertAmount(result.data.final_amount)

        setAppliedDiscount({
          ...result.data,
          final_amount: convertedFinalAmount, // store the converted amount so flutterwave gets the right amount
        })
        toast.success('Discount applied successfully!')
      } else {
        setDiscountError(result.message || 'Invalid discount code')
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

  // Flutterwave Config
  const fwConfig: any = {
    public_key: fwPublicKey,
    tx_ref: txRef,
    amount: isPendingSecondPayment ? upsellAmount : finalAmount,
    currency: finalCurrency,
    // Only pass planId for the first payment, the second payment (upsell) is a one-time charge
    ...(planId && !isPendingSecondPayment ? { payment_plan: planId } : {}),

    customer: {
      email: dynamicEmail,
      phone_number: '',
      name: dynamicName,
    },
    meta: {
      course_uuid: isPendingSecondPayment ? 'career-accelerator' : courseId,
    },
    customizations: {
      title: isPendingSecondPayment ? 'Career Accelerator' : courseName,
      description: isPendingSecondPayment
        ? 'Payment for Career Accelerator'
        : 'Payment for course access',
      logo: 'https://lms.africanainetwork.com/logo.png',
    },
  }

  // Paystack Config
  const psConfig = {
    reference: txRef,
    email: dynamicEmail,
    amount: (isPendingSecondPayment ? upsellAmount : finalAmount) * 100, // Paystack expects lowest denomination (e.g. kobo/cents)
    publicKey: psPublicKey,
    currency: finalCurrency,
    ...(planId && !isPendingSecondPayment ? { plan: planId } : {}),
    metadata: {
      course_uuid: isPendingSecondPayment ? 'career-accelerator' : courseId,
      custom_fields: [],
    },
  }

  const handleFlutterwavePayment = useFlutterwave(fwConfig)
  const initializePaystackPayment = usePaystackPayment(psConfig as any)

  const triggerPayment = (emailToUse: string, nameToUse: string) => {
    const onSuccess = () => {
      if (isUpsellSelected && !isPendingSecondPayment) {
        // First payment successful, prepare for second
        toast.success(
          'Subscription payment successful! Please complete your Career Accelerator purchase.'
        )
        setIsPendingSecondPayment(true)
        setTxRef(Date.now().toString()) // regenerate tx_ref for second payment
      } else {
        toast.success('Payment successful! Verifying your enrollment...')
        setTimeout(() => {
          router.push(`/course/${courseId}`)
        }, 2000)
      }
    }

    const onClose = () => {
      setIsProcessing(false)
    }

    if (fwPublicKey && fwPublicKey !== 'your_flutterwave_public_key_here') {
      handleFlutterwavePayment({
        callback: async (response) => {
          if (response.status === 'successful') {
            onSuccess()
          } else {
            toast.error('Payment failed or was cancelled.')
            setIsProcessing(false)
          }
        },
        onClose: onClose,
      })
    } else if (psPublicKey) {
      ;(initializePaystackPayment as any)(onSuccess, onClose)
    } else {
      toast.error('No payment provider configured.')
      setIsProcessing(false)
    }
  }

  const processPayment = (userEmail: string, userName: string) => {
    setIsProcessing(true)
    setDynamicEmail(userEmail)
    setDynamicName(userName)

    // Close auth modal if open
    setIsModalOpen(false)
    setIsProcessing(false)

    if (skipDiscountModal) {
      setTimeout(() => {
        triggerPayment(userEmail, userName)
      }, 100)
    } else {
      // Instead of jumping to payment immediately, open the discount modal!
      setIsDiscountModalOpen(true)
    }
  }

  const handleClick = () => {
    if (session.status === 'authenticated') {
      // User is logged in, skip signup, proceed to discount modal
      processPayment(
        session.data.user.email,
        session.data.username || session.data.user.name || ''
      )
    } else {
      // User is not logged in, show signup modal first
      setIsModalOpen(true)
    }
  }

  const handleSignupSuccess = async (userData: any, resData: any) => {
    setIsProcessing(true)
    // Signup was successful! Auto-login the user
    try {
      await signIn('credentials', {
        email: userData.email,
        password: userData.password,
        redirect: false,
      })
      // Trigger processPayment to open discount modal
      processPayment(
        userData.email,
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
          userData.username
      )
    } catch (error) {
      toast.error('Failed to log you in automatically.')
      setIsProcessing(false)
    }
  }

  const handleFinalCheckout = () => {
    // Actually trigger Paystack/Flutterwave
    setIsProcessing(true)
    setIsDiscountModalOpen(false)

    setTimeout(() => {
      triggerPayment(dynamicEmail, dynamicName)
    }, 100)
  }

  return (
    <>
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
                      ? 'Proceed to Phase 1 Payment \u2192'
                      : 'Proceed to Payment \u2192'}
                  </>
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* SECOND PAYMENT MODAL */}
      <Dialog.Root
        open={isPendingSecondPayment}
        onOpenChange={(open) => {
          if (!open && !isProcessing) {
            // Prevent closing until they complete or cancel explicitly?
            // We can let them close it but they won't be charged for the second part.
            setIsPendingSecondPayment(false)
            router.push(`/course/${courseId}`)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] animate-in fade-in duration-200" />
          <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[110] animate-in zoom-in-95 duration-200 p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Subscription Successful! 🎉
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              You are now subscribed to the All-Access plan. Please complete the
              one-time payment for the Career Accelerator to finalize your
              setup.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Career Accelerator
              </p>
              <p className="text-3xl font-black text-gray-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: finalCurrency,
                }).format(upsellAmount)}
              </p>
            </div>
            <Button
              onClick={() => {
                setIsProcessing(true)
                triggerPayment(dynamicEmail, dynamicName)
              }}
              disabled={isProcessing}
              className="w-full h-12 text-[15px] font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Pay Career Accelerator \u2192'
              )}
            </Button>
            <button
              onClick={() => {
                setIsPendingSecondPayment(false)
                router.push(`/course/${courseId}`)
              }}
              className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Skip for now
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
