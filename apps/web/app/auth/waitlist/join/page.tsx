import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import africanAiLogo from 'public/african_ai_horizontal.png'
import WaitlistSignUpComponent from '../../signup/WaitlistSignUp'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

interface WaitlistJoinPageProps {
  searchParams: Promise<{ waitlist_uuid?: string; orgslug?: string }>
}

async function WaitlistJoinPage(props: WaitlistJoinPageProps) {
  const { waitlist_uuid, orgslug } = await props.searchParams

  if (!waitlist_uuid) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50">
        <div className="w-full md:w-[500px] py-12 px-6">
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Invite Not Found
            </h1>
            <p className="text-slate-600">
              The waitlist invite link is invalid or has expired. Please request
              a new invite from your organization.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-black text-white font-bold rounded-xl hover:bg-slate-800"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50">
      <div className="w-full md:w-[500px] py-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
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

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Join the Waitlist
            </h1>
            <p className="text-sm text-slate-500 italic">
              Get early access and select your courses
            </p>
          </div>

          <div className="w-full">
            {waitlist_uuid && (
              <WaitlistSignUpComponent waitlistUuid={waitlist_uuid} />
            )}
          </div>

          <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-50">
            Already have an account?{' '}
            <Link
              href={`/login?orgslug=${orgslug}`}
              className="font-bold text-black hover:underline"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default WaitlistJoinPage
