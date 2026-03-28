'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import { getOrgLogoMediaDirectory } from '@services/media/media'

interface LandingNavbarProps {
  org: any
  orgslug: string
  variant?: string
}

const LandingNavbar: React.FC<LandingNavbarProps> = ({
  org,
  orgslug,
  variant,
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
    { name: 'Specializations', href: '/#specializations' },
    { name: 'Privacy Policy', href: '/policy' },
  ]

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ease-in-out
        ${
          variant === 'policy'
            ? isScrolled
              ? 'py-4 bg-white text-black border-b border-zinc-200 shadow'
              : 'py-6 bg-white text-black'
            : isScrolled
              ? 'py-4 bg-black/70 backdrop-blur-xl border-b border-white/10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.05)]'
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
                    : 'h-full w-auto object-contain brightness-0 invert'
                }`}
              />
            ) : (
              <span
                className={`text-xl font-black tracking-tighter ${variant === 'policy' ? 'text-black' : 'text-white'} uppercase italic`}
              >
                {org?.name || 'AAN'}
              </span>
            )}
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className={`text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ${variant === 'policy' ? 'hover:text-black' : 'hover:text-white'} transition-colors`}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/auth/signin"
            className={`text-[10px] font-black uppercase tracking-[0.2em] ${variant === 'policy' ? 'text-black' : 'text-white'} hover:opacity-70 transition-opacity`}
          >
            Login
          </Link>
          <Link
            href="/auth/signup"
            className={`px-6 py-3 ${variant === 'policy' ? 'bg-none' : 'bg-white'} ${variant === 'policy' ? 'text-black' : 'text-black'} rounded-xl ${variant === 'policy' ? 'border border-blue-500' : ''} font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 transition-all`}
          >
            Join Now
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden relative z-10 text-white p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black z-[90] flex flex-col items-center justify-center p-6">
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
              href="/auth/signup"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              Join Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

export default LandingNavbar
