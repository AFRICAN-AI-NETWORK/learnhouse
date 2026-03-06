'use client'
import React, { use } from 'react'
import '@styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { OrgMenu } from '@components/Objects/Menus/OrgMenu'
import { NotificationProvider } from '@components/Contexts/NotificationContext'
import { GlobalChatProvider } from '@components/Contexts/GlobalChatContext'

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
            <main className="flex-1 w-full overflow-auto">{children}</main>
          </GlobalChatProvider>
        </NotificationProvider>
      </SessionProvider>
    </div>
  )
}
