'use client'
import React from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen,
  Video,
  Radio,
  ShieldCheck,
  HelpCircle,
  Music,
  Clock,
  Users,
} from 'lucide-react'

function StaffHandbookPage() {
  return (
    <div className="flex-1 bg-[#101010] min-h-screen p-8 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
            <BookOpen size={12} /> Internal Staff Guide
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Staff Handbook
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl font-medium leading-relaxed">
            Welcome to the official Learning Management manual. This guide is
            specifically designed for our instructors, mentors, and
            administrators to master the live session engine.
          </p>
        </div>

        {/* Live Session Feature Guide */}
        <section className="space-y-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-white shadow-2xl">
              <Video size={24} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Live Session Workshops
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HandbookCard
              icon={<Radio size={20} className="text-red-400" />}
              title="Automatic YouTube Replays"
              description="When you create a Live Session with a YouTube link, the system automatically bridges the video feed. To start the stream, simply join the room. The system will auto-trigger the 'Live Stream' command if you are a Moderator."
            />
            <HandbookCard
              icon={<ShieldCheck size={20} className="text-emerald-400" />}
              title="The 'Leave' vs 'End' Safety"
              description="Instructors and Managers have a 'Leave Room' button. This is SAFE—it exits the room for you but keeps the class running. Only Admins can 'End & Archive', which terminates the session for everyone."
            />
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Music size={20} className="text-indigo-400" /> Pre-Show: Keeping
              Students Engaged
            </h3>
            <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
              <p>
                Before the speaker officially starts, we recommend playing music
                or a 'Starting Soon' video:
              </p>
              <ul className="space-y-3 list-none">
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    1
                  </div>
                  <p>
                    <span className="text-white font-bold">Share YouTube:</span>{' '}
                    In the Jitsi toolbar, click '... More' &rarr; 'Share YouTube
                    Video' and paste a Lo-Fi music stream link.
                  </p>
                </li>
                <li className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    2
                  </div>
                  <p>
                    <span className="text-white font-bold">
                      Screen Share Audio:
                    </span>{' '}
                    If you share a Chrome tab (like Spotify), check 'Share Tab
                    Audio' in the browser popup to broadcast clear audio.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatMini
              icon={<Clock size={14} />}
              label="Auto-Start"
              value="Join to Sync"
            />
            <StatMini
              icon={<Users size={14} />}
              label="Moderators"
              value="All Staff"
            />
            <StatMini
              icon={<HelpCircle size={14} />}
              label="Troubleshooting"
              value="Meet.jit.si"
            />
          </div>
        </section>

        {/* Future Guides Placeholder */}
        <div className="pt-12 border-t border-white/5 opacity-50">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">
            More modules coming soon: Batch Communications, Assignment Grading,
            and Student Mentorship.
          </p>
        </div>
      </div>
    </div>
  )
}

function HandbookCard({
  icon,
  title,
  description,
}: {
  icon: any
  title: string
  description: string
}) {
  return (
    <motion.div
      whileHover={{ translateY: -5 }}
      className="bg-zinc-900 border border-white/5 rounded-3xl p-8 space-y-4 shadow-2xl"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <h4 className="text-white font-bold text-lg">{title}</h4>
      <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
    </motion.div>
  )
}

function StatMini({
  icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
      <div className="text-zinc-600">{icon}</div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-tighter text-zinc-600">
          {label}
        </p>
        <p className="text-xs font-bold text-zinc-300">{value}</p>
      </div>
    </div>
  )
}

export default StaffHandbookPage
