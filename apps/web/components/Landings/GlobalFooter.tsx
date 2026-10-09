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
import { getOrgLogoMediaDirectory } from '@services/media/media'
import NextImage from 'next/image'

export default function GlobalFooter() {
  const org = useOrg() as any
  const orgSlug = org?.slug || 'aan'
  const orgName = org?.name || 'African AI Network Academy'

  return (
    <footer className="bg-white text-[#555555] pt-24 pb-12 px-6 border-t border-gray-100">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Column 1: Branding */}
          <div className="space-y-6 pr-4">
            <div className="flex items-center gap-3 h-10">
              {org?.logo_image ? (
                <NextImage
                  src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                  alt={orgName}
                  style={{ width: 'auto', height: '100%' }}
                  className="h-full w-auto object-contain"
                  width={200}
                  height={200}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#111827] rounded-xl flex items-center justify-center font-bold text-white text-lg">
                    {orgName.charAt(0)}
                  </div>
                  <span className="font-bold text-lg text-[#111827]">
                    {orgName}
                  </span>
                </div>
              )}
            </div>
            <p className="text-[15px] leading-[1.7] max-w-sm">
              Practical tech education for Africa's next generation of
              professionals. Learn skills. Build projects. Get hired.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://x.com/_AANetwork_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://www.linkedin.com/company/african-ai-network/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-colors"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="https://www.instagram.com/africanainetwork?igsh=MWhhY20yNXduNnhxMA=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/Africanainetwork.aan"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#111827] hover:bg-gray-100 transition-colors"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Courses */}
          <div>
            <h4 className="text-[17px] font-bold text-[#111827] mb-6">
              Programs
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/aan-open')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  AAN Open
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/ai-automation')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  AI Automation
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/ai-fundamentals')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  AI Fundamentals
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="text-[17px] font-bold text-[#111827] mb-6">
              Company
            </h4>
            <ul className="space-y-4">
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/about')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/contact')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/policy')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href={getUriWithOrg(orgSlug, '/affiliation/signup')}
                  className="hover:text-[#111827] text-[15px] transition-colors"
                >
                  Partners
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support */}
          <div>
            <h4 className="text-[17px] font-bold text-[#111827] mb-6">
              Support
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-[15px]">
                <Phone size={18} className="text-[#111827]" />
                +234 907 316 6932
              </li>
              <li className="flex items-center gap-3 text-[15px]">
                <MessageSquare size={18} className="text-[#111827]" />
                <a
                  href="https://wa.me/2349073166932"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#111827] transition-colors"
                >
                  WhatsApp Us
                </a>
              </li>
              <li className="flex items-center gap-3 text-[15px]">
                <Mail size={18} className="text-[#111827]" />
                <a
                  href="mailto:education@africanainetwork.com"
                  className="hover:text-[#111827] transition-colors"
                >
                  education@africanainetwork.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-gray-100 gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p className="text-[14px]">
              &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
            </p>
            <p className="text-[13px] text-gray-400">
              Powered by FootprintWorld AI
            </p>
          </div>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 text-gray-500 hover:text-[#111827] transition-colors group"
          >
            <span className="text-[14px] font-bold">Back to Top</span>
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-[#111827] group-hover:border-[#111827] group-hover:text-white transition-all">
              <ArrowRight size={18} className="-rotate-90" />
            </div>
          </button>
        </div>
      </div>
    </footer>
  )
}
