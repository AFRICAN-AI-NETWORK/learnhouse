'use client'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import { getUriWithOrg } from '@services/config/config'
import {
  ImageIcon,
  TextIcon,
  LucideIcon,
  Share2Icon,
  LayoutDashboardIcon,
  CodeIcon,
  GlobeIcon,
} from 'lucide-react'
import Link from 'next/link'
import React, { use } from 'react'
import { motion } from 'framer-motion'
import OrgEditGeneral from '@components/Dashboard/Pages/Org/OrgEditGeneral/OrgEditGeneral'
import OrgEditImages from '@components/Dashboard/Pages/Org/OrgEditImages/OrgEditImages'
import OrgEditSocials from '@components/Dashboard/Pages/Org/OrgEditSocials/OrgEditSocials'
import OrgEditLanding from '@components/Dashboard/Pages/Org/OrgEditLanding/OrgEditLanding'
import OrgEditOther from '@components/Dashboard/Pages/Org/OrgEditOther/OrgEditOther'
import OrgEditIntegrations from '@components/Dashboard/Pages/Org/OrgEditIntegrations/OrgEditIntegrations'
import { useTranslation } from 'react-i18next'

export type OrgParams = {
  subpage: string
  orgslug: string
}

interface TabItem {
  id: string
  label: string
  icon: LucideIcon
}

const getSettingTabs = (t: any): TabItem[] => [
  {
    id: 'general',
    label: t('dashboard.organization.settings.tabs.general'),
    icon: TextIcon,
  },
  {
    id: 'landing',
    label: t('dashboard.organization.settings.tabs.landing'),
    icon: LayoutDashboardIcon,
  },
  {
    id: 'previews',
    label: t('dashboard.organization.settings.tabs.previews'),
    icon: ImageIcon,
  },
  {
    id: 'socials',
    label: t('dashboard.organization.settings.tabs.socials'),
    icon: Share2Icon,
  },
  {
    id: 'integrations',
    label: t('dashboard.organization.settings.tabs.integrations'),
    icon: GlobeIcon,
  },
  {
    id: 'other',
    label: t('dashboard.organization.settings.tabs.other'),
    icon: CodeIcon,
  },
]

function TabLink({
  tab,
  isActive,
  orgslug,
}: {
  tab: TabItem
  isActive: boolean
  orgslug: string
}) {
  return (
    <Link href={getUriWithOrg(orgslug, '') + `/dash/org/settings/${tab.id}`}>
      <div
        className={`py-2 w-fit text-center border-black transition-all ease-linear ${
          isActive ? 'border-b-4' : 'opacity-50'
        } cursor-pointer`}
      >
        <div className="flex items-center space-x-2.5 mx-2.5">
          <tab.icon size={16} />
          <div>{tab.label}</div>
        </div>
      </div>
    </Link>
  )
}

function OrgPage(props: { params: Promise<OrgParams> }) {
  const { t } = useTranslation()
  const params = use(props.params)
  const getLabels = () => {
    if (params.subpage == 'general') {
      return {
        h1: t('dashboard.organization.settings.pages.general.title'),
        h2: t('dashboard.organization.settings.pages.general.subtitle'),
      }
    } else if (params.subpage == 'previews') {
      return {
        h1: t('dashboard.organization.settings.pages.previews.title'),
        h2: t('dashboard.organization.settings.pages.previews.subtitle'),
      }
    } else if (params.subpage == 'socials') {
      return {
        h1: t('dashboard.organization.settings.pages.socials.title'),
        h2: t('dashboard.organization.settings.pages.socials.subtitle'),
      }
    } else if (params.subpage == 'landing') {
      return {
        h1: t('dashboard.organization.settings.pages.landing.title'),
        h2: t('dashboard.organization.settings.pages.landing.subtitle'),
      }
    } else if (params.subpage == 'other') {
      return {
        h1: t('dashboard.organization.settings.pages.other.title'),
        h2: t('dashboard.organization.settings.pages.other.subtitle'),
      }
    } else if (params.subpage == 'integrations') {
      return {
        h1: t('dashboard.organization.settings.pages.integrations.title'),
        h2: t('dashboard.organization.settings.pages.integrations.subtitle'),
      }
    }
    return { h1: '', h2: '' }
  }

  const { h1: H1Label, h2: H2Label } = getLabels()

  return (
    <div className="min-h-full w-full bg-[#f8f8f8] flex flex-col overflow-x-hidden">
      <div className="px-4 sm:px-6 lg:px-10 tracking-tight bg-[#fcfbfc] nice-shadow shrink-0">
        <BreadCrumbs type="org"></BreadCrumbs>
        <div className="my-2  py-2">
          <div className="w-100 flex flex-col space-y-1">
            <div className="pt-3 font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tighter wrap-break-word">
              {H1Label}
            </div>
            <div className="flex font-medium text-gray-400 text-md">
              {H2Label}{' '}
            </div>
          </div>
        </div>
        <div className="flex space-x-0.5 font-black text-sm overflow-x-auto">
          {getSettingTabs(t).map((tab) => (
            <TabLink
              key={tab.id}
              tab={tab}
              isActive={params.subpage === tab.id}
              orgslug={params.orgslug}
            />
          ))}
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
        {params.subpage == 'general' ? <OrgEditGeneral /> : ''}
        {params.subpage == 'previews' ? <OrgEditImages /> : ''}
        {params.subpage == 'socials' ? <OrgEditSocials /> : ''}
        {params.subpage == 'landing' ? <OrgEditLanding /> : ''}
        {params.subpage == 'integrations' ? <OrgEditIntegrations /> : ''}
        {params.subpage == 'other' ? <OrgEditOther /> : ''}
      </motion.div>
    </div>
  )
}

export default OrgPage
