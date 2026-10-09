'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { useCurrency } from '@components/Contexts/CurrencyContext'
import africanAiLogo from 'public/african_ai_horizontal.png'
import NextImage from 'next/image'

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
  const { currency, setCurrency } = useCurrency()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Programs', href: '/#programs' },
    { name: 'Impact', href: '/#impact' },
    { name: 'Methodology', href: '/#methodology' },
    { name: 'Testimonials', href: '/#testimonials' },
    { name: 'Affiliates', href: '/#affiliate' },
    { name: 'FAQ', href: '/#faq' },
  ]

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col w-full">
      <nav
        className={`w-full transition-all duration-500 ease-in-out
          ${
            variant === 'policy'
              ? isScrolled
                ? 'py-4 bg-white text-[#111827] border-b border-gray-100 shadow-sm'
                : 'py-6 bg-white text-[#111827]'
              : isScrolled
                ? 'py-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm'
                : 'py-6 bg-transparent'
          }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href={getUriWithOrg(orgslug, '/')} className="relative z-10">
            <div className="flex items-center h-10">
              {org?.logo_image ? (
                <NextImage
                  src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                  alt="Learnhouse"
                  style={{ width: 'auto', height: '100%' }}
                  className="h-full w-auto object-contain"
                  width={800}
                  height={800}
                />
              ) : (
                <NextImage
                  src={africanAiLogo.src}
                  alt="African AI Network"
                  style={{ width: 'auto', height: '100%' }}
                  className="h-full w-auto object-contain"
                  width={800}
                  height={800}
                />
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[15px] font-semibold text-[#555555] hover:text-[#111827] transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative inline-block w-max">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="appearance-none bg-transparent text-sm font-bold text-gray-500 hover:text-gray-900 py-2 pl-3 pr-8 rounded-lg outline-none cursor-pointer transition-colors"
              >
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="GHS">GHS</option>
                <option value="KES">KES</option>
                <option value="ZAR">ZAR</option>
                <option value="UGX">UGX</option>
                <option value="RWF">RWF</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <ChevronDown size={14} />
              </div>
            </div>

            {isAuthenticated ? (
              <Link
                href={getUriWithOrg(orgslug, '/')}
                className="px-6 py-3 bg-[#111827] text-white rounded-xl font-bold text-[15px] hover:bg-black transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-6 py-2.5 text-[#111827] font-bold text-[15px] hover:opacity-80 transition-opacity"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-6 py-2.5 bg-[#111827] text-white rounded-xl font-bold text-[15px] hover:bg-black transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden relative z-[101] p-2 text-[#111827]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-8 text-center w-full max-w-sm">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-bold text-[#111827]"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-px w-20 bg-gray-200 my-4" />
              <div className="relative inline-block w-max">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="appearance-none bg-gray-50 text-lg font-bold text-[#111827] py-3 pl-6 pr-12 rounded-xl outline-none border border-gray-200 focus:ring-2 focus:ring-purple-500 w-full text-center"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="NGN">NGN - Nigerian Naira</option>
                  <option value="GHS">GHS - Ghanaian Cedi</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="RWF">RWF - Rwandan Franc</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <ChevronDown size={20} />
                </div>
              </div>
              <Link
                href="/auth/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-bold text-[#555555]"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full px-8 py-4 bg-[#111827] text-white rounded-xl font-bold text-[15px]"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Sticky Bottom Action Bar (Mobile Only) */}
      {!isAuthenticated && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[90] p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <Link
            href="/auth/signin"
            className="flex-1 text-center py-3.5 bg-gray-50 text-[#111827] rounded-xl font-bold text-[15px] border border-gray-200"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="flex-1 text-center py-3.5 bg-[#111827] text-white rounded-xl font-bold text-[15px]"
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  )
}

export default LandingNavbar
