'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface RefPageProps {
  params: {
    code: string
  }
}

/**
 * Referral link page: /ref/[code]
 *
 * Stores the referral code in localStorage, then immediately
 * redirects to the signup page. No API calls are made here.
 */
function ReferralRedirectPage({ params }: RefPageProps) {
  const { code } = params
  const router = useRouter()

  useEffect(() => {
    if (code) {
      try {
        localStorage.setItem('referral_code', code)
      } catch {
        // localStorage unavailable (incognito, etc.) — proceed without storing
      }
    }
    router.replace('/auth/signup')
  }, [code, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Redirecting to sign up…</p>
      </div>
    </div>
  )
}

export default ReferralRedirectPage
