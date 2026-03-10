'use client'
import DashLeftMenu from '@components/Dashboard/Menus/DashLeftMenu'
import DashMobileMenu from '@components/Dashboard/Menus/DashMobileMenu'
import AdminAuthorization from '@components/Security/AdminAuthorization'
import { SessionProvider } from 'next-auth/react'
import React from 'react'
import { useMediaQuery } from 'usehooks-ts'
import { NotificationProvider } from '@components/Contexts/NotificationContext'
import { GlobalChatProvider } from '@components/Contexts/GlobalChatContext'
import FloatingChatWidget from '@components/Objects/FloatingChatWidget'

function ClientAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: any
}) {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <SessionProvider>
      <NotificationProvider>
        <GlobalChatProvider>
          <AdminAuthorization authorizationMode="page">
            <div className="flex flex-col md:flex-row">
              {isMobile ? <DashMobileMenu /> : <DashLeftMenu />}
              <div className="flex w-full">{children}</div>
            </div>
          </AdminAuthorization>
          <FloatingChatWidget />
        </GlobalChatProvider>
      </NotificationProvider>
    </SessionProvider>
  )
}

export default ClientAdminLayout
