'use client'
import React, { use } from 'react'
import '@styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { OrgMenu } from '@components/Objects/Menus/OrgMenu'
import { NotificationProvider } from '@components/Contexts/NotificationContext'
import { GlobalChatProvider } from '@components/Contexts/GlobalChatContext'
import FloatingChatWidget from '@components/Objects/FloatingChatWidget'

export default function RootLayout(props: {
  children: React.ReactNode
  params: Promise<any>
}) {
  const params = use(props.params)

  const { children } = props

  return (
    <div className="theme-landing h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <SessionProvider>
        <NotificationProvider>
          <GlobalChatProvider>
            <OrgMenu orgslug={params?.orgslug}></OrgMenu>
            <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scrollbar-hide">
              {children}
            </main>
            <FloatingChatWidget />
          </GlobalChatProvider>
        </NotificationProvider>
      </SessionProvider>
    </div>
  )
}
