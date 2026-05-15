'use client'
import africanAiLogo from 'public/african_ai_horizontal.png'
import Image from 'next/image'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import React from 'react'
import { Handshake } from 'lucide-react'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'
import PartnerSignUpComponent from './PartnerSignup'

interface SignUpClientProps {
  org: any
}

function AffiliationSignUpClient(props: SignUpClientProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50 py-12">
      <div className="w-full md:w-[550px] px-6">
        <div className="flex justify-between items-center mb-8">
          <Link href={getUriWithOrg(props.org?.slug, '/')}>
            <Image
              quality={100}
              width={160}
              src={africanAiLogo}
              alt="African AI Network"
              className="w-auto h-8 hover:opacity-80 transition-opacity"
            />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 space-y-10 relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />

          <div className="text-center space-y-3 relative z-10">
            <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Handshake size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              Become a Partner
            </h1>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Join our network of ambassadors and earn commissions for every
              student you refer to African AI.
            </p>
          </div>

          <div className="w-full relative z-10">
            <PartnerSignUpComponent />
          </div>

          <p className="text-center text-xs text-slate-400 pt-6 border-t border-slate-50 relative z-10">
            By joining, you agree to our Partnership Terms and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          Already have an account?{' '}
          <Link
            href={`/login?orgslug=${props.org?.slug}`}
            className="font-bold text-slate-900 hover:underline"
          >
            Log in here
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AffiliationSignUpClient
