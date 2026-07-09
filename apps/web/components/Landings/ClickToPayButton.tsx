'use client'

import React, { useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2, CreditCard } from 'lucide-react'
import OpenSignUpComponent from '@/app/auth/signup/OpenSignup'
import { useFlutterwave } from 'flutterwave-react-v3'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'

interface ClickToPayButtonProps {
  courseId: string
  priceAmount: number
  currency: string
  courseName: string
  planId?: string // Optional Flutterwave Plan ID for subscriptions
}

export default function ClickToPayButton({
  courseId,
  priceAmount,
  currency,
  courseName,
  planId,
}: ClickToPayButtonProps) {
  const session = useLHSession() as any
  const org = useOrg() as any
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fwPublicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || ''

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

  // Flutterwave Config
  const fwConfig = {
    public_key: fwPublicKey,
    tx_ref: txRef,
    amount: priceAmount,
    currency: currency,
    payment_options: 'card,mobilemoney,ussd',
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

  const handleFlutterwavePayment = useFlutterwave(fwConfig)

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
    } else {
      toast.error('No payment provider configured.')
      setIsProcessing(false)
    }
  }

  const processPayment = (userEmail: string, userName: string) => {
    setIsProcessing(true)
    setDynamicEmail(userEmail)
    setDynamicName(userName)

    // We use a timeout to let React update the dynamicEmail state before hooks consume it
    // Or we just rely on the override for Paystack, but Flutterwave doesn't support overrides easily
    // We will just let React re-render with the new email, then trigger payment
    setTimeout(() => {
      triggerPayment(userEmail, userName)
    }, 100)
  }

  const handleClick = () => {
    if (session.status === 'authenticated') {
      // User is logged in, skip signup, proceed straight to payment
      processPayment(session.data.user.email, session.data.username)
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
      // Trigger Flutterwave payment immediately with their new credentials
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
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
