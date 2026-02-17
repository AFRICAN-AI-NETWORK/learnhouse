'use client'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import CountdownTimer from '@components/Utils/CountdownTimer'
import { getWaitlistDetails } from '@services/waitlist/waitlist'
import { WaitlistConfig } from '@/types/waitlist'
import { Calendar, Mail, BookOpen } from 'lucide-react'

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
    ? new Date(waitlist.launch_datetime)
    : null

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
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12 text-white text-center">
            <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-semibold mb-4 backdrop-blur-sm">
              ⏱️ On Waitlist
            </div>
            <h1 className="text-4xl font-bold mb-2">The countdown begins!</h1>
            <p className="text-indigo-100 text-lg">
              Your learning journey is about to start
            </p>
          </div>

          {/* Countdown */}
          <div className="px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              Time until launch
            </h2>
            <div className="mb-12">
              <CountdownTimer launchDate={launchDate?.toISOString()} />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Launch Date Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mx-auto mb-4">
                  <Calendar size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Launch Date</h3>
                <p className="text-sm text-slate-600">
                  {launchDate
                    ? launchDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'TBD'}
                </p>
              </div>

              {/* Email Notification Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 text-green-600 mx-auto mb-4">
                  <Mail size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">
                  Email Notification
                </h3>
                <p className="text-sm text-slate-600">
                  We'll email you the moment the platform opens
                </p>
              </div>

              {/* Courses Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 mx-auto mb-4">
                  <BookOpen size={24} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">
                  Your Interests
                </h3>
                <p className="text-sm text-slate-600">
                  Access your selected courses immediately
                </p>
              </div>
            </div>

            {/* Highlight Box */}
            <div className="p-8 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 mb-8">
              <p className="text-lg font-bold text-amber-900 mb-2">
                🎉 We can't wait to see you!
              </p>
              <p className="text-amber-700">
                You'll be able to login immediately after the launch. Your
                courses and materials will be ready to explore.
              </p>
            </div>

            {/* Contact Section */}
            <div className="text-center space-y-3 pb-8 border-b border-slate-200 mb-8">
              <p className="text-slate-600">
                Have questions? Contact our support team
              </p>
              <a
                href="mailto:support@learnhouse.com"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Mail size={16} />
                support@learnhouse.com
              </a>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/login?orgslug=${orgslug}`}
                className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-center"
              >
                Go to Login
              </Link>
              <Link
                href={`/orgs/${orgslug}`}
                className="px-6 py-3 bg-slate-100 text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors text-center"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CountdownPage
