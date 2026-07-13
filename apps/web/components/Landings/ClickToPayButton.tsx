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

  // Fix impure Date.now() call during render
  const [txRef] = useState(() => Date.now().toString())

  React.useEffect(() => {
    if (session?.status === 'authenticated' && session?.data?.user?.email) {
      setDynamicEmail(session.data.user.email)
      setDynamicName(session.data.username || session.data.user.name || '')
    }
  }, [session])

  const baseAmount = convertAmount(priceAmount)
  const finalAmount = appliedDiscount
    ? appliedDiscount.final_amount // the backend returns the final amount
    : baseAmount
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
          final_amount: convertedFinalAmount // store the converted amount so flutterwave gets the right amount
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
    amount: finalAmount,
    currency: finalCurrency,

    customer: {
      email: dynamicEmail,
      phone_number: '',
      name: dynamicName,
    },
    meta: {
      course_uuid: courseId,
    },
    customizations: {
      title: courseName,
      description: 'Payment for course access',
      logo: 'https://lms.africanainetwork.com/logo.png',
    },
  }

  // Paystack Config
  const psConfig = {
    reference: txRef,
    email: dynamicEmail,
    amount: finalAmount * 100, // Paystack expects lowest denomination (e.g. kobo/cents)
    publicKey: psPublicKey,
    currency: finalCurrency,
    metadata: {
      course_uuid: courseId,
      custom_fields: [],
    },
  }

  const handleFlutterwavePayment = useFlutterwave(fwConfig)
  const initializePaystackPayment = usePaystackPayment(psConfig as any)

  const triggerPayment = (emailToUse: string, nameToUse: string) => {
    // If the state hasn't caught up, Flutterwave/Paystack config might use old state.
    // However, react-paystack allows passing a config override.

    const onSuccess = () => {
      toast.success('Payment successful! Verifying your enrollment...')
      setTimeout(() => {
        router.push(`/course/${courseId}`)
      }, 2000)
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
      processPayment(session.data.user.email, session.data.username || session.data.user.name || '')
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
      <Dialog.Root open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
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
              
              <div className="mt-4 flex items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: finalCurrency,
                  }).format(finalAmount)}
                </span>
                {appliedDiscount && (
                  <span className="ml-3 text-lg text-gray-400 line-through decoration-gray-300">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: finalCurrency,
                    }).format(baseAmount)}
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
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="uppercase bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                      disabled={isValidatingDiscount}
                    />
                    <Button
                      variant="secondary"
                      onClick={handleApplyDiscount}
                      disabled={!discountCode.trim() || isValidatingDiscount}
                      className="font-semibold px-6 shadow-sm"
                    >
                      {isValidatingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {discountError && (
                    <p className="text-sm text-red-500 font-medium animate-in slide-in-from-top-1">{discountError}</p>
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

              <Button
                onClick={handleFinalCheckout}
                disabled={isProcessing}
                className="w-full h-12 text-[15px] font-bold rounded-xl shadow-[0_4px_14px_0_rgb(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Proceed to Payment &rarr;</>
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
