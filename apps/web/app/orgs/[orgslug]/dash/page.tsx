'use client'
import Image from 'next/image'
import React from 'react'
import africanAiLogo from '../../../../public/african_ai_horizontal.png'
import {
  BookCopy,
  School,
  Settings,
  Users,
  GitMerge,
  Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import AdminAuthorization from '@components/Security/AdminAuthorization'
import { useTranslation } from 'react-i18next'

function DashboardHome() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-center mx-auto min-h-screen flex-col p-4 sm:mb-0 mb-16">
      <div className="mx-auto pb-6 sm:pb-10">
        <Image
          alt="African AI Network logo"
          width={280}
          src={africanAiLogo}
          className="w-48 sm:w-auto"
        />
      </div>
      <AdminAuthorization authorizationMode="component">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 max-w-2xl w-full">
          {/* Card components */}
          <DashboardCard
            href="/dash/courses"
            icon={<BookCopy className="mx-auto text-gray-500" size={50} />}
            title={t('dashboard.home.cards.courses.title')}
            description={t('dashboard.home.cards.courses.description')}
          />
          <DashboardCard
            href="/dash/org/settings/general"
            icon={<School className="mx-auto text-gray-500" size={50} />}
            title={t('dashboard.home.cards.organization.title')}
            description={t('dashboard.home.cards.organization.description')}
          />
          <DashboardCard
            href="/dash/users/settings/users"
            icon={<Users className="mx-auto text-gray-500" size={50} />}
            title={t('dashboard.home.cards.users.title')}
            description={t('dashboard.home.cards.users.description')}
          />
          <DashboardCard
            href="/dash/referrals"
            icon={<GitMerge className="mx-auto text-gray-500" size={50} />}
            title="Referrals"
            description="Earn commissions by referring new users"
          />
          <DashboardCard
            href="/dash/communications"
            icon={<Megaphone className="mx-auto text-gray-500" size={50} />}
            title="Communications"
            description="Send batch emails and announcements to students"
          />
        </div>
      </AdminAuthorization>
      <div className="flex flex-col gap-6 sm:gap-10 mt-6 sm:mt-10">
        <Link
          href={'/dash/user-account/settings/general'}
          className="flex bg-white shadow-lg p-4 items-center rounded-lg mx-auto hover:scale-105 transition-all ease-linear cursor-pointer max-w-md"
        >
          <div className="flex flex-col sm:flex-row mx-auto gap-2 sm:gap-3 items-center text-center sm:text-left">
            <Settings className="text-gray-500" size={20} />
            <div>
              <div className="font-bold text-gray-500">
                {t('dashboard.home.cards.account_settings.title')}
              </div>
              <p className="text-sm text-gray-400">
                {t('dashboard.home.cards.account_settings.description')}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}

// New component for dashboard cards
function DashboardCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex bg-white shadow-lg p-6 w-full rounded-lg items-center mx-auto hover:scale-105 transition-all ease-linear cursor-pointer"
    >
      <div className="flex flex-col mx-auto gap-2">
        {icon}
        <div className="text-center font-bold text-gray-500">{title}</div>
        <p className="text-center text-sm text-gray-400">{description}</p>
      </div>
    </Link>
  )
}

export default DashboardHome
