'use client'

import React from 'react'
import OrgScripts from '@/components/OrgScripts/OrgScripts'
import { usePathname } from 'next/navigation'

import { useLHSession } from '@components/Contexts/LHSessionContext'
import Link from 'next/link'

const Footer: React.FC = () => {
  const pathname = usePathname()
  const session = useLHSession() as any
  const isGuest = !session?.data?.user

  // The footer (and specifically the privacy link) should ONLY be visible on the home page
  // However, on the Premium Landing Page (for guests), we hide it to favor the custom black footer.
  const isHomePage = pathname === '/' || pathname === '/home'
  const shouldHideOnLanding = isHomePage && isGuest

  if (!isHomePage || shouldHideOnLanding) {
    return (
      <footer className="w-full mt-auto">
        <OrgScripts />
      </footer>
    )
  }

  return (
    <footer className="w-full mt-auto">
      <OrgScripts />

      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm py-8">
        <div className="max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-16 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-zinc-500">
            © {new Date().getFullYear()} African AI Network. All rights
            reserved.
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/privacy"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
