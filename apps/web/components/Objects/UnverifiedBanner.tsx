import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'

export default function UnverifiedBanner() {
  const session = useLHSession() as any

  if (session?.status !== 'authenticated') return null

  // If user is verified or data is missing, don't show
  if (session?.data?.user?.email_verified !== false) return null

  return (
    <div className="w-full bg-amber-500 text-black px-4 py-3 flex items-center justify-center gap-3 shadow-md z-50">
      <AlertTriangle size={20} className="flex-shrink-0" />
      <p className="text-sm font-medium text-center">
        Your email address is unverified. Please check your inbox for a
        verification link to secure your account.
      </p>
    </div>
  )
}
