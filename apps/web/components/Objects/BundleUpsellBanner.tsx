'use client'

import React, { useEffect, useState } from 'react'
import { getPublicProducts } from '@services/payments/public-products'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

import Modal from '@components/Objects/StyledElements/Modal/Modal'
import CoursePaidOptions from '@components/Objects/Courses/CourseActions/CoursePaidOptions'

// Define a minimal Course type for the props if an exact front-end type isn't exported globally
type Course = any

// We recreate a minimal type here to avoid importing the huge payments_product type if not needed globally.
type PaymentsProduct = {
  id: number
  name: string
  description: string
  amount: number
  currency: string
  product_type: 'one_time' | 'subscription'
}

interface BundleUpsellBannerProps {
  course: Course
  orgslug: string
  orgId: number
}

export default function BundleUpsellBanner({
  course,
  orgslug,
  orgId,
}: BundleUpsellBannerProps) {
  const [bundles, setBundles] = useState<PaymentsProduct[]>([])
  const [standaloneProduct, setStandaloneProduct] =
    useState<PaymentsProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function findUpsells() {
      try {
        setLoading(true)
        // 1. Fetch all products
        const allProducts = await getPublicProducts(orgId)

        if (!allProducts || allProducts.length === 0) {
          setLoading(false)
          return
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/payments/${orgId}/courses/${course.id}/products`,
          {}
        )

        if (res.ok) {
          const courseProducts: PaymentsProduct[] = await res.json()

          // Separate standalone (cheapest/single) vs bundles
          if (courseProducts.length > 1) {
            // Sort by price
            const sorted = [...courseProducts].sort(
              (a, b) => a.amount - b.amount
            )
            setStandaloneProduct(sorted[0])
            setBundles(sorted.slice(1)) // Everything else is considered an upsell/bundle
          } else if (courseProducts.length === 1) {
            setStandaloneProduct(courseProducts[0])
          }
        }
      } catch (error) {
        // Silently fail if upsells cannot be fetched so we don't break the page
      } finally {
        setLoading(false)
      }
    }

    if (course && course.id) {
      void findUpsells()
    } else {
      setLoading(false)
    }
  }, [course, orgId])

  if (loading) {
    return (
      <div className="w-full h-16 bg-slate-100 rounded-xl animate-pulse mb-6" />
    )
  }

  if (!course?.is_paid && bundles.length === 0) {
    return null
  }

  const bestBundle = bundles[0] || standaloneProduct || { name: course?.name || 'Full Course Access' }

  const landingPath = (() => {
    const name = (course?.name || '').toLowerCase()
    if (name.includes('content creator')) return getUriWithOrg(orgslug, '/ai-automation-content-creators')
    if (name.includes('business') || name.includes('automation')) return getUriWithOrg(orgslug, '/ai-automation')
    if (name.includes('data science') || name.includes('fundamentals')) return getUriWithOrg(orgslug, '/ai-fundamentals')
    if (name.includes('engineering')) return getUriWithOrg(orgslug, '/ai-engineering')
    if (name.includes('node') || name.includes('backend')) return getUriWithOrg(orgslug, '/nodejs-backend')
    if (name.includes('laravel')) return getUriWithOrg(orgslug, '/laravel-backend')
    if (name.includes('frontend')) return getUriWithOrg(orgslug, '/frontend-dev')
    if (name.includes('career') || name.includes('accelerator')) return getUriWithOrg(orgslug, '/career-accelerator')
    return null
  })()

  return (
    <>
      <Modal
        isDialogOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        dialogContent={<CoursePaidOptions course={course} />}
        dialogTitle="Purchase Course"
        dialogDescription="Select a payment option to access this course"
        minWidth="sm"
      />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-linear-to-r from-amber-100 via-orange-50 to-amber-100 border border-amber-200 rounded-2xl p-6 mb-8 nice-shadow relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={64} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles size={12} />
              Best Value
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-1">
              Upgrade to the {bestBundle.name}
            </h3>
            <p className="text-slate-600 text-sm">
              Choose a plan that works best for you. You can either pay monthly or make a one-time payment to get full lifetime access.
            </p>
          </div>

          {landingPath ? (
            <Link
              href={landingPath}
              className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95"
            >
              View Packages
              <ArrowRight size={18} />
            </Link>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
            >
              Purchase Course
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}
