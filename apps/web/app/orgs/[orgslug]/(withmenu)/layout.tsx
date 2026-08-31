'use client'
import React, { use, Suspense } from 'react'
import '@styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { OrgMenu } from '@components/Objects/Menus/OrgMenu'
import { NotificationProvider } from '@components/Contexts/NotificationContext'
import { GlobalChatProvider } from '@components/Contexts/GlobalChatContext'
import FloatingChatWidget from '@components/Objects/FloatingChatWidget'
import { usePathname, useSearchParams } from 'next/navigation'
import LandingNavbar from '@components/Landings/LandingNavbar'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import UnverifiedBanner from '@components/Objects/UnverifiedBanner'

import { CurrencyProvider } from '@components/Contexts/CurrencyContext'

function LayoutInner(props: {
  children: React.ReactNode
  params: any
  org: any
  session: any
}) {
  const { children, params, org, session } = props
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLandingPage =
    pathname === '/' ||
    pathname === `/${params?.orgslug}` ||
    pathname === `/orgs/${params?.orgslug}`
  const isProgramDetailPage =
    pathname?.endsWith('/aan-open') ||
    pathname?.endsWith('/ai-automation') ||
    pathname?.endsWith('/ai-fundamentals') ||
    pathname?.endsWith('/ai-automation-content-creators') ||
    pathname?.endsWith('/contact') ||
    pathname?.endsWith('/about')
  const isGuest = !session?.data?.user
  const isPremiumLandingView = searchParams?.get('landing') === 'premium'
  const shouldShowLandingNavbar =
    (isLandingPage || isProgramDetailPage) && (isGuest || isPremiumLandingView)

  return (
    <div
      className={`${shouldShowLandingNavbar ? 'theme-landing' : ''} bg-background text-foreground flex flex-col ${
        isLandingPage || isProgramDetailPage
          ? 'min-h-screen overflow-visible'
          : 'h-screen overflow-hidden'
      }`}
    >
      <CurrencyProvider>
        <SessionProvider>
          <NotificationProvider>
            <GlobalChatProvider>
              {shouldShowLandingNavbar ? (
                <LandingNavbar
                  org={org}
                  orgslug={params?.orgslug}
                  isAuthenticated={!isGuest}
                  variant={
                    pathname?.endsWith('/about') ||
                    pathname?.endsWith('/policy') ||
                    pathname?.endsWith('/contact')
                      ? 'policy'
                      : undefined
                  }
                />
              ) : (
                <OrgMenu orgslug={params?.orgslug}></OrgMenu>
              )}
              <main
                className={`flex-1 w-full overflow-x-hidden ${
                  isLandingPage || isProgramDetailPage
                    ? 'overflow-y-visible'
                    : 'min-h-0 overflow-y-auto scrollbar-hide'
                }`}
              >
                {!shouldShowLandingNavbar && <UnverifiedBanner />}
                {children}
              </main>
              <FloatingChatWidget />
            </GlobalChatProvider>
          </NotificationProvider>
        </SessionProvider>
      </CurrencyProvider>
    </div>
  )
}

export default function RootLayout(props: {
  children: React.ReactNode
  params: Promise<any>
}) {
  const params = use(props.params)
  const org = useOrg()
  const session = useLHSession() as any

  return (
    <Suspense fallback={<div className="h-screen w-screen bg-background" />}>
      <LayoutInner params={params} org={org} session={session}>
        {props.children}
      </LayoutInner>
    </Suspense>
  )
}
