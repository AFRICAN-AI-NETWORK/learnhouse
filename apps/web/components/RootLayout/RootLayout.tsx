'use client'
import React from 'react'
import '@/styles/globals.css'
import StyledComponentsRegistry from '@components/Utils/libs/styled-registry'
import { motion } from 'framer-motion'
import { SessionProvider } from 'next-auth/react'
import LHSessionProvider from '@components/Contexts/LHSessionContext'
import { isDevEnv } from '@/app/auth/options'
import Script from 'next/script'
import '@/lib/i18n'
import I18nProvider from '@components/Contexts/I18nContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const variants = {
    hidden: { opacity: 0, x: 0, y: 0 },
    enter: { opacity: 1, x: 0, y: 0 },
    exit: { opacity: 0, x: 0, y: 0 },
  }

  return (
    <html lang="en" suppressHydrationWarning>
      {/* We intentionally use a raw <head> here for App Router + custom <html> so PWA manifest/icons are detected correctly. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/runtime-config.js" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />

        {/* Apple / Mobile PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LMS" />

        {/* PWA Icons */}
        <link rel="icon" href="/icons/icon-48x48.png" sizes="48x48" />
        <link rel="icon" href="/icons/icon-72x72.png" sizes="72x72" />
        <link rel="icon" href="/icons/icon-96x96.png" sizes="96x96" />
        <link rel="icon" href="/icons/icon-128x128.png" sizes="128x128" />
        <link rel="icon" href="/icons/icon-144x144.png" sizes="144x144" />
        <link rel="icon" href="/icons/icon-152x152.png" sizes="152x152" />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" />
        <link rel="icon" href="/icons/icon-256x256.png" sizes="256x256" />
        <link rel="icon" href="/icons/icon-384x384.png" sizes="384x384" />
        <link rel="icon" href="/icons/icon-512x512.png" sizes="512x512" />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-192x192.png"
          sizes="192x192"
        />
      </head>
      <body suppressHydrationWarning>
        {isDevEnv ? (
          ''
        ) : (
          <Script
            data-website-id="a1af6d7a-9286-4a1f-8385-ddad2a29fcbb"
            src="/umami/script.js"
          />
        )}

        <SessionProvider key="session-provider" refetchInterval={60000}>
          <LHSessionProvider>
            <I18nProvider>
              <StyledComponentsRegistry>
                <motion.main
                  variants={variants}
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  transition={{ type: 'tween' }}
                >
                  {children}
                </motion.main>
              </StyledComponentsRegistry>
            </I18nProvider>
          </LHSessionProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
