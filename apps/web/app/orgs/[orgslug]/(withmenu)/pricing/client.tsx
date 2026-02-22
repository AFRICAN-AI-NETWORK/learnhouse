'use client'

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Info, Loader2 } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { getStripeProductCheckoutSession } from '@services/payments/products'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import toast from 'react-hot-toast'

type PaymentsProduct = {
  id: number
  name: string
  description: string
  amount: number
  currency: string
  benefits?: string
  product_type: 'one_time' | 'subscription'
}

type Props = {
  orgslug: string
  initialProducts: PaymentsProduct[]
}

const parseBenefits = (benefitsString?: string) => {
  if (!benefitsString) return []
  return benefitsString.split('\n').filter((b) => b.trim() !== '')
}

export default function PricingPageClient({ orgslug, initialProducts }: Props) {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>(
    'monthly'
  )
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null)

  const handleCheckout = async (productId: number) => {
    if (!access_token) {
      // Redirect to login if not authenticated
      router.push('/login?orgslug=' + orgslug)
      return
    }

    try {
      setLoadingProductId(productId)
      const redirectUri =
        typeof window !== 'undefined'
          ? `${window.location.origin}${getUriWithOrg(orgslug, '/courses')}`
          : ''

      // orgId is required for the checkout session API
      // We'll extract it from the first product or use a robust method if available
      const orgId = session?.data?.user?.current_org_id || 1 // Fallback if missing

      const checkoutResponse = (await getStripeProductCheckoutSession(
        orgId,
        productId,
        redirectUri,
        access_token
      )) as any

      if (checkoutResponse && checkoutResponse.checkout_url) {
        window.location.href = checkoutResponse.checkout_url
      } else {
        toast.error(
          checkoutResponse?.error ||
            checkoutResponse?.detail ||
            'Failed to initialize checkout session'
        )
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to initialize checkout')
    } finally {
      setLoadingProductId(null)
    }
  }

  // In a real scenario, you'd define rules for categorization (e.g., by name string matching or a new DB field).
  // For now, we render all active products dynamically. You can filter/group them based on your business logic.
  const bundledProducts = initialProducts.filter(
    (p) =>
      p.name.toLowerCase().includes('bundle') ||
      p.name.toLowerCase().includes('package') ||
      p.name.toLowerCase().includes('mastery')
  )
  const standardProducts = initialProducts.filter(
    (p) => !bundledProducts.includes(p)
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full">
        {initialProducts.length === 0 ? (
          <div className="text-center py-20">
            <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No packages available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Check back later for updated pricing and packages.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center"
          >
            {initialProducts.map((product) => {
              const benefits = parseBenefits(product.benefits)
              const isPopular =
                product.name.toLowerCase().includes('bundle') ||
                product.name.toLowerCase().includes('fundamentals')

              return (
                <motion.div
                  key={product.id}
                  variants={itemVariants}
                  className={`relative flex flex-col bg-white rounded-xl p-6 sm:p-8 transition-all duration-200 ${
                    isPopular
                      ? 'border-2 border-gray-900 shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:scale-[1.02] z-10'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-4 sm:right-6 -translate-y-1/2">
                      <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gray-900 text-white shadow-sm whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-8">
                    <h3 className="text-xl font-extrabold text-[#111827] uppercase tracking-tight mb-2 leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-[15px] font-medium text-gray-400 min-h-[40px]">
                      {product.description}
                    </p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-start text-gray-900">
                      <span className="text-5xl font-black tracking-tighter mt-1">
                        $
                      </span>
                      <span className="text-6xl sm:text-7xl font-black tracking-tighter ml-1">
                        {new Intl.NumberFormat('en-US', {
                          style: 'decimal',
                          minimumFractionDigits: 0,
                        }).format(product.amount)}
                      </span>
                      {product.product_type === 'subscription' && (
                        <span className="ml-1 text-lg font-medium text-gray-500 self-end mb-2">
                          /mo
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-4 mb-8">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5 stroke-3" />
                        <p className="text-[15px] leading-relaxed text-[#4B5563]">
                          {benefit}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(product.id)}
                    disabled={loadingProductId === product.id}
                    className={`w-full flex justify-center items-center px-6 py-3.5 border border-transparent text-base font-bold rounded-xl transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${
                      isPopular
                        ? 'bg-[#111827] text-white hover:bg-black shadow-[0_4px_14px_0_rgb(0,0,0,0.25)]'
                        : 'bg-white text-[#111827] border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    {loadingProductId === product.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
