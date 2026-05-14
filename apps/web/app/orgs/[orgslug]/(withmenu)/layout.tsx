'use client'
import React, { use } from 'react'
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

export default function RootLayout(props: {
  children: React.ReactNode
  params: Promise<any>
}) {
  const params = use(props.params)
  const org = useOrg()
  const session = useLHSession() as any

  const { children } = props
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLandingPage =
    pathname === '/' ||
    pathname === `/${params?.orgslug}` ||
    pathname === `/orgs/${params?.orgslug}`
  const isGuest = !session?.data?.user
  const isPremiumLandingView = searchParams?.get('landing') === 'premium'
  const shouldShowLandingNavbar =
    isLandingPage && (isGuest || isPremiumLandingView)

  return (
    <div
      className={`${shouldShowLandingNavbar ? 'theme-landing' : ''} bg-background text-foreground flex flex-col ${
        isLandingPage
          ? 'min-h-screen overflow-visible'
          : 'h-screen overflow-hidden'
      }`}
    >
      <SessionProvider>
        <NotificationProvider>
          <GlobalChatProvider>
            {shouldShowLandingNavbar ? (
              <LandingNavbar
                org={org}
                orgslug={params?.orgslug}
                isAuthenticated={!isGuest}
              />
            ) : (
              <OrgMenu orgslug={params?.orgslug}></OrgMenu>
            )}
            <main
              className={`flex-1 w-full overflow-x-hidden ${
                isLandingPage
                  ? 'overflow-y-visible'
                  : 'min-h-0 overflow-y-auto scrollbar-hide'
              }`}
            >
              {children}
            </main>
            <FloatingChatWidget />
          </GlobalChatProvider>
        </NotificationProvider>
      </SessionProvider>
    </div>
  )
}
