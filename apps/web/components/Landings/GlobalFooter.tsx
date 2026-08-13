'use client'

import React from 'react'
import Link from 'next/link'
import {
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Phone,
  MessageSquare,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'

export default function GlobalFooter() {
  const org = useOrg() as any
  const orgSlug = org?.slug || 'aan'
  const orgName = org?.name || 'African AI Network Academy'

  return (
    <footer className="bg-[#0a0f1e] text-white pt-20 pb-10 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Column 1: Branding */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0057ff] rounded-md flex items-center justify-center font-bold text-white">
                {orgName.charAt(0)}
              </div>
              <span className="font-bold text-lg">{orgName}</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Practical tech education for Africa's next generation of
              professionals. Learn skills. Build projects. Get hired.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://x.com/_AANetwork_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://www.linkedin.com/company/african-ai-network/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://www.instagram.com/africanainetwork?igsh=MWhhY20yNXduNnhxMA=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/Africanainetwork.aan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Courses */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest mb-6">
              Courses
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/aan-open')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  AAN Open
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/ai-automation')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  AI Automation
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/ai-fundamentals')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  AI Fundamentals
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/about')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/contact')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/policy')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/marketer/register')}
                  className="text-gray-400 hover:text-white text-sm transition-colors font-medium text-amber-400 hover:text-amber-300"
                >
                  Become a Marketer & Earn
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/affiliation/signup')}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest mb-6">
              Support.
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone size={16} />
                +234 907 316 6932
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <MessageSquare size={16} />
                <a
                  href="https://wa.me/2349073166932"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail size={16} />
                <a
                  href="mailto:education@africanainetwork.com"
                  className="hover:text-white transition-colors"
                >
                  education@africanainetwork.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
            </p>
            <p className="text-xs font-semibold text-gray-400">
              Powered by FootprintWorld AI
            </p>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <span className="text-[12px] font-bold uppercase tracking-widest">
              Back to Top
            </span>
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#0057ff] group-hover:border-[#0057ff] group-hover:text-white transition-all">
              <ArrowRight size={18} className="-rotate-90" />
            </div>
          </button>
        </div>
      </div>
    </footer>
  )
}
