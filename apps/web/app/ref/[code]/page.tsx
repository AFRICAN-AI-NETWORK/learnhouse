'use client'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

interface RefPageProps {
  params: Promise<{ code: string }>
}

function ReferralRedirectPage({ params }: RefPageProps) {
  const { code } = use(params)
  const router = useRouter()

  useEffect(() => {
    if (!code) return

    try {
      localStorage.setItem('referral_code', code)
    } catch (e) {
      // localStorage error fallback
    }

    router.replace(`/auth/signup`)
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
