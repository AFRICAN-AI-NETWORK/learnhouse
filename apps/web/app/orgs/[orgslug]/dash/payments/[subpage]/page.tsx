'use client'
import React, { use } from 'react'
import { motion } from 'framer-motion'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { Users, Gem } from 'lucide-react'
import PaymentsConfigurationPage from '@components/Dashboard/Pages/Payments/PaymentsConfigurationPage'
import PaymentsProductPage from '@components/Dashboard/Pages/Payments/PaymentsProductPage'
import PaymentsCustomersPage from '@components/Dashboard/Pages/Payments/PaymentsCustomersPage'
import PaymentsDiscountsPage from '@components/Dashboard/Pages/Payments/PaymentsDiscountsPage'
import useFeatureFlag from '@components/Hooks/useFeatureFlag'
import { Ticket } from 'lucide-react'

export type PaymentsParams = {
  subpage: string
  orgslug: string
}

function PaymentsPage(props: { params: Promise<PaymentsParams> }) {
  const params = use(props.params)
  const subpage = params.subpage || 'customers'

  const isPaymentsEnabled = useFeatureFlag({
    path: ['features', 'payments', 'enabled'],
    defaultValue: true,
  })

  const getPageTitle = () => {
    switch (subpage) {
      case 'customers':
        return {
          h1: 'Customers',
          h2: 'View and manage your customer information',
        }
      case 'paid-products':
        return {
          h1: 'Paid Products',
          h2: 'Manage your paid products and pricing',
        }
      case 'configuration':
        return {
          h1: 'Payment Configuration',
          h2: 'Set up and manage your payment gateway',
        }
      case 'discounts':
        return {
          h1: 'Discounts',
          h2: 'Create and manage discount codes for your courses',
        }
      default:
        return {
          h1: 'Payments',
          h2: 'Overview of your payment settings and transactions',
        }
    }
  }

  if (!isPaymentsEnabled) {
    return (
      <div className="h-screen w-full bg-[#f8f8f8] flex items-center justify-center p-4 dark:bg-[#0f0f13]">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md dark:border dark:border-white/8 dark:bg-[#13131a]">
          <h2 className="text-xl font-bold mb-4 dark:text-white">
            Payments Not Available
          </h2>
          <p className="text-gray-600 dark:text-white/65">
            The payments feature is not enabled for this organization.
          </p>
          <p className="text-gray-600 mt-2 dark:text-white/65">
            Please contact your administrator to enable payments.
          </p>
        </div>
      </div>
    )
  }

  const { h1, h2 } = getPageTitle()

  return (
    <div className="min-h-screen w-full bg-[#f8f8f8] flex flex-col overflow-x-hidden dark:bg-[#0f0f13]">
      <div className="px-4 sm:px-6 lg:px-10 tracking-tight bg-[#fcfbfc] z-10 nice-shadow shrink-0 dark:border-b dark:border-white/8 dark:bg-[#13131a]">
        <BreadCrumbs type="payments" />
        <div className="my-2 py-2">
          <div className="w-100 flex flex-col space-y-1">
            <div className="pt-3 font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tighter dark:text-white">
              {h1}
            </div>
            <div className="flex font-medium text-gray-400 text-md dark:text-white/45">
              {h2}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 font-black text-sm overflow-x-auto no-scrollbar dark:text-white/80">
          <TabLink
            href={getUriWithOrg(params.orgslug, '/dash/payments/customers')}
            icon={<Users size={16} />}
            label="Customers"
            isActive={subpage === 'customers'}
          />
          <TabLink
            href={getUriWithOrg(params.orgslug, '/dash/payments/paid-products')}
            icon={<Gem size={16} />}
            label="Products & Subscriptions"
            isActive={subpage === 'paid-products'}
          />
          {/* <TabLink
            href={getUriWithOrg(params.orgslug, '/dash/payments/configuration')}
            icon={<Settings size={16} />}
            label="Configuration"
            isActive={subpage === 'configuration'}
          /> */}
          <TabLink
            href={getUriWithOrg(params.orgslug, '/dash/payments/discounts')}
            icon={<Ticket size={16} />}
            label="Discounts"
            isActive={subpage === 'discounts'}
          />
        </div>
      </div>
      <div className="h-6 shrink-0"></div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, type: 'spring', stiffness: 80 }}
        className="flex-1 overflow-y-auto"
      >
        {subpage === 'configuration' && <PaymentsConfigurationPage />}
        {subpage === 'paid-products' && <PaymentsProductPage />}
        {subpage === 'customers' && <PaymentsCustomersPage />}
        {subpage === 'discounts' && <PaymentsDiscountsPage />}
      </motion.div>
    </div>
  )
}

const TabLink = ({
  href,
  icon,
  label,
  isActive,
}: {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}) => (
  <Link href={href}>
    <div
      className={`py-2 w-fit text-center border-black transition-all ease-linear dark:border-indigo-400 ${isActive ? 'border-b-4' : 'opacity-50'} cursor-pointer`}
    >
      <div className="flex items-center space-x-2.5 mx-2">
        {icon}
        <div>{label}</div>
      </div>
    </div>
  </Link>
)

export default PaymentsPage
