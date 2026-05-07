'use client'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import CountdownTimer from '@components/Utils/CountdownTimer'
import { getWaitlistDetails } from '@services/waitlist/waitlist'
import { WaitlistConfig } from '@/types/waitlist'
import { CheckCircle2 } from 'lucide-react'
import { SiWhatsapp } from '@icons-pack/react-simple-icons'
import toast from 'react-hot-toast'

function CountdownPage() {
  const searchParams = useSearchParams()
  const waitlistUuid = searchParams.get('waitlist_uuid') || ''
  const orgslug = searchParams.get('orgslug') || ''
  const whatsappGroupUrl =
    'https://chat.whatsapp.com/BohSUrcVlPREw5KUS2vEPr?mode=gi_t'

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
        toast.error('Failed to fetch waitlist:')
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

            <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    <SiWhatsapp size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      Stay updated on WhatsApp
                    </p>
                    <p className="text-xs leading-5 text-slate-600">
                      Join the official group for launch updates and helpful
                      information while you wait.
                    </p>
                  </div>
                </div>

                <a
                  href={whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  <SiWhatsapp size={16} />
                  Join Group
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CountdownPage
