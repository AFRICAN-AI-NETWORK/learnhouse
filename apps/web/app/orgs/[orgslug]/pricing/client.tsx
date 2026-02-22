'use client'

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Info } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>(
    'monthly'
  )

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
    <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-500">
            Choose the perfect package to accelerate your journey in the AAN
            Ecosystem. From foundational knowledge to tech specialization.
          </p>
        </div>

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
                  className={`relative flex flex-col bg-white rounded-2xl p-8 nice-shadow border ${
                    isPopular
                      ? 'border-primary shadow-xl scale-105 z-10'
                      : 'border-gray-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary text-white shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 min-h-[40px]">
                      {product.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline text-5xl font-extrabold text-gray-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: product.currency,
                        minimumFractionDigits: 0,
                      }).format(product.amount)}
                      {product.product_type === 'subscription' && (
                        <span className="ml-1 text-xl font-medium text-gray-500">
                          /mo
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-4 mb-8">
                    {benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start">
                        <div className="shrink-0">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                        <p className="ml-3 text-sm text-gray-700">{benefit}</p>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={getUriWithOrg(orgslug, `/checkout/${product.id}`)}
                    className={`block w-full text-center px-6 py-3 border border-transparent text-base font-medium rounded-xl transition-colors duration-200 ${
                      isPopular
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    Get Started
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
