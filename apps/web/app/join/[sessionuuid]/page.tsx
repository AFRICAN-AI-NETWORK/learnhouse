'use client'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Video,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'
import { getActivityByID } from '@services/courses/activities'
import Link from 'next/link'

export default function JoinSessionLanding() {
  const params = useParams()
  const sessionUuid = params.sessionuuid as string
  const [activity, setActivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadActivity = async () => {
      try {
        // Fetching activity details (Publicly accessible part)
        const res = await getActivityByID(sessionUuid, null, '')
        setActivity(res)
      } catch (e) {
        console.error('Failed to load session', e)
      } finally {
        setLoading(false)
      }
    }
    if (sessionUuid) loadActivity()
  }, [sessionUuid])

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-800 border-t-white rounded-full animate-spin" />
      </div>
    )

  if (!activity)
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-black text-white mb-4">
          Session Not Found
        </h1>
        <p className="text-zinc-500 mb-8 max-w-md">
          The workshop link you followed is invalid or has already expired.
        </p>
        <Link
          href="/"
          className="bg-white text-black px-8 py-3 rounded-2xl font-bold"
        >
          Return Home
        </Link>
      </div>
    )

  const details = activity.details || {}
  const startTime = new Date(details.start_time)

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-red-500/30">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 px-8 py-10 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <Video className="text-black" size={20} />
          </div>
          <span className="font-black text-xl tracking-tight uppercase">
            AAN Workshops
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm font-bold text-zinc-400">
          <span className="hover:text-white transition-colors cursor-pointer uppercase tracking-widest text-[10px]">
            Upcoming
          </span>
          <span className="hover:text-white transition-colors cursor-pointer uppercase tracking-widest text-[10px]">
            Resources
          </span>
          <button className="bg-white/5 border border-white/10 px-6 py-2 rounded-xl text-white uppercase tracking-widest text-[10px] font-black">
            Admin Login
          </button>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-8 pt-12 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />{' '}
            Live Event
          </div>

          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9]">
            {activity.name}
          </h1>

          <p className="text-xl text-zinc-400 font-medium max-w-xl leading-relaxed">
            Join our expert-led workshop on the African AI Network. Interactive
            sessions designed to accelerate your career in the new economy.
          </p>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                  Date
                </p>
                <p className="font-bold">
                  {startTime.toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                  Time
                </p>
                <p className="font-bold">
                  {startTime.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-12 shadow-2xl space-y-8"
        >
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight">
              Reserve your spot
            </h3>
            <p className="text-zinc-500 text-sm font-medium">
              Join 200+ other students already registered for this session.
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-bold placeholder:text-zinc-600"
            />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-bold placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-4 pt-4">
            <button className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-white/5 active:scale-[0.98]">
              Register to Join <ArrowRight size={18} />
            </button>
            <p className="text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck size={12} /> Securely Managed by AAN LMS
            </p>
          </div>

          <div className="pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black tracking-tight">2.5k+</p>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                Global Students
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black tracking-tight">Free</p>
              <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                Access Pass
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-12 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-8 py-6">
          <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
            © 2024 African AI Network. Empowering the next generation.
          </p>
          <div className="flex items-center gap-6">
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest hover:text-zinc-400 cursor-pointer transition-colors">
              Privacy
            </p>
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest hover:text-zinc-400 cursor-pointer transition-colors">
              Terms of Service
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
