'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import africanAiLogo from 'public/african_ai_horizontal.png'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import NextImage from 'next/image'

interface AuthSplitLayoutProps {
  children: React.ReactNode
  org: any
  title: string
  subtitle?: string
}

const AuthSplitLayout = ({
  children,
  org,
  title,
  subtitle,
}: AuthSplitLayoutProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#020617'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#020617]">
      {/* Left side: Form Area */}
      <div className="flex w-full flex-col justify-center px-6 py-12 md:w-1/2 lg:px-24 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-sm">
          {/* Top Bar / Icons */}
          <div className="flex justify-between items-center mb-8">
            <Link href={getUriWithOrg(org?.slug, '/')}>
              <Image
                quality={100}
                height={32}
                src={africanAiLogo}
                alt="African AI Network"
                className="hover:opacity-80 transition-opacity w-auto"
              />
            </Link>
            <LanguageSwitcher />
          </div>

          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-500 text-sm italic">{subtitle}</p>
            )}
          </div>

          {/* Form Content */}
          <div className="bg-white">{children}</div>
        </div>
      </div>

      {/* Right side: Branding Panel (Hidden on Mobile) */}
      <div
        className="hidden md:flex md:w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #020617 100%)',
        }}
      >
        {/* Subtle Decorative Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <div className="mb-8">
            {org?.logo_image ? (
              <NextImage
                src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                alt={org?.name}
                className="h-24 w-auto rounded-2xl shadow-2xl ring-4 ring-white/10 bg-white p-2"
                width={800}
                height={800}
              />
            ) : (
              <Image
                quality={100}
                width={240}
                src={africanAiLogo}
                alt="African AI Network"
                className="opacity-90 w-auto h-auto"
              />
            )}
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            {org?.name || 'African AI Network'}
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            {t('auth.login_to')} {org?.name}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthSplitLayout
