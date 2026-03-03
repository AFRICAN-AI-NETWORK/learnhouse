'use client'
import React, { use } from 'react'
import '@styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import { OrgMenu } from '@components/Objects/Menus/OrgMenu'

export default function RootLayout(props: {
  children: React.ReactNode
  params: Promise<any>
}) {
  const params = use(props.params)

  const { children } = props

  return (
    <div className="theme-landing min-h-screen bg-background text-foreground flex flex-col">
      <SessionProvider>
        <OrgMenu orgslug={params?.orgslug}></OrgMenu>
        <main className="flex-1 w-full">{children}</main>
      </SessionProvider>
    </div>
  )
}
