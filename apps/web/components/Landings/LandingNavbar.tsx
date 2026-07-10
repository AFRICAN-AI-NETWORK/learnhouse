'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import africanAiLogo from 'public/african_ai_horizontal.png'
import TopMarqueeBanner from './Sections/TopMarqueeBanner'

interface LandingNavbarProps {
  org: any
  orgslug: string
  variant?: string
  isAuthenticated?: boolean
}

const LandingNavbar: React.FC<LandingNavbarProps> = ({
  org,
  orgslug,
  variant,
  isAuthenticated = false,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Programs', href: '/#available' },
    { name: 'Roadmap', href: '/#roadmap' },
    {
      name: 'Partners',
      href: isAuthenticated ? '/dash/affiliation' : '/affiliation/signup',
    },
    { name: 'Specializations', href: '/#specializations' },
    { name: 'Privacy Policy', href: '/policy' },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col w-full">
      {variant !== 'policy' && <TopMarqueeBanner />}
      <nav
        className={`w-full transition-all duration-500 ease-in-out
          ${
            variant === 'policy'
              ? isScrolled
                ? 'py-4 bg-white text-black border-b border-zinc-200 shadow dark:bg-[#13131a] dark:text-white dark:border-white/8 dark:shadow-[0_10px_30px_rgba(0,0,0,0.35)]'
                : 'py-6 bg-white text-black dark:bg-[#13131a] dark:text-white'
              : isScrolled
                ? 'py-4 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm'
                : 'py-6 bg-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href={getUriWithOrg(orgslug, '/')} className="relative z-10">
            <div className="flex items-center h-10">
              {org?.logo_image ? (
                <img
                  src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                  alt="Learnhouse"
                  style={{ width: 'auto', height: '100%' }}
                  className={`${
                    variant === 'policy'
                      ? 'rounded-md'
                      : 'h-full w-auto object-contain'
                  }`}
                />
              ) : (
                <img
                  src={africanAiLogo.src}
                  alt="African AI Network"
                  style={{ width: 'auto', height: '100%' }}
                  className={`${
                    variant === 'policy'
                      ? 'rounded-md'
                      : 'h-full w-auto object-contain'
                  }`}
                />
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {[
              { name: 'Programs', href: '/#programs' },
              { name: 'Benefits', href: '/#impact' },
              { name: 'Methodology', href: '/#methodology' },
              { name: 'Specializations', href: '/#specializations' },
              {
                name: 'Partners',
                href: isAuthenticated
                  ? '/dash/affiliation'
                  : '/affiliation/signup',
              },
              { name: 'FAQ', href: '/#faq' },
            ].map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={`text-[13px] font-bold uppercase tracking-wider text-gray-500 hover:text-[#0057ff] transition-colors`}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              <Link
                href={getUriWithOrg(orgslug, '/')}
                className={`px-6 py-3 ${variant === 'policy' ? 'bg-none' : 'bg-white'} text-black rounded-xl ${variant === 'policy' ? 'border border-blue-500 dark:text-white dark:border-blue-400/50' : ''} font-bold text-[13px] uppercase tracking-wider hover:scale-105 transition-all`}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className={`px-6 py-3 bg-[#0057ff] text-white rounded-xl font-bold text-[13px] uppercase tracking-wider hover:bg-[#0046cc] hover:scale-105 transition-all shadow-md shadow-[#0057ff]/20`}
                >
                  Login
                </Link>
                <Link
                  href="/#programs"
                  className={`px-6 py-3 rounded-xl font-bold text-[13px] uppercase tracking-wider transition-all hover:scale-105 bg-transparent text-[#0a0f1e] border border-[#0a0f1e]/20 hover:bg-[#0a0f1e]/5`}
                >
                  Apply Now
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className={`md:hidden relative z-10 p-2 text-[#0a0f1e]`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black z-90 flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-8 text-center">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-black uppercase tracking-widest text-white"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px w-20 bg-zinc-800 my-4" />
              <Link
                href="/auth/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-black uppercase tracking-widest text-zinc-400"
              >
                Login
              </Link>
              <Link
                href="/#programs"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest"
              >
                Apply Now
              </Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  )
}

export default LandingNavbar
