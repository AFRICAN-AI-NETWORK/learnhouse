'use client'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import CountdownTimer from '@components/Utils/CountdownTimer'
import { getWaitlistDetails } from '@services/waitlist/waitlist'
import { WaitlistConfig } from '@/types/waitlist'
import { CheckCircle2 } from 'lucide-react'

function CountdownPage() {
  const searchParams = useSearchParams()
  const waitlistUuid = searchParams.get('waitlist_uuid') || ''
  const orgslug = searchParams.get('orgslug') || ''

  const [waitlist, setWaitlist] = useState<WaitlistConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWaitlist = async () => {
      try {
        if (waitlistUuid) {
          const res = await getWaitlistDetails(waitlistUuid)
          if (res.success) {
            setWaitlist(res.data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch waitlist:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchWaitlist()
  }, [waitlistUuid])

  const launchDate = waitlist?.launch_datetime

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="mb-6 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
              <CheckCircle2 size={48} className="text-emerald-600" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              You've joined the waitlist!
            </h2>

            <p className="text-slate-600 mb-6 max-w-[360px] mx-auto">
              Check your email to verify your account. You'll be able to login
              on{' '}
              {launchDate
                ? new Date(launchDate).toLocaleDateString()
                : 'the launch date'}
              .
            </p>

            <div className="mb-6">
              <CountdownTimer launchDate={launchDate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CountdownPage
