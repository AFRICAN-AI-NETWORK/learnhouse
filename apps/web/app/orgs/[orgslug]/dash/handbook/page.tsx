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

        {/* Batch Communication Guide */}
        <section className="space-y-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shadow-2xl">
              <Radio size={24} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Batch Communication (Admin)
            </h2>
          </div>
          <HandbookCard
            icon={<Radio size={20} className="text-emerald-400" />}
            title="Broadcasting Announcements"
            description="Admins can send announcements to all users, waitlists, courses, or roles using the Communications Hub. Messages can include banners and be posted to email and chat."
          />
          <div className="bg-zinc-900/50 border border-emerald-500/10 rounded-[32px] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Step-by-Step: Sending a Batch Campaign
            </h3>
            <ol className="space-y-4 text-zinc-400 text-sm leading-relaxed list-decimal ml-6">
              <li>
                <span className="text-white font-bold">
                  Open Communications Hub:
                </span>{' '}
                Go to the dashboard and select "Communication Hub" from the
                menu.
              </li>
              <li>
                <span className="text-white font-bold">Compose Campaign:</span>{' '}
                Enter a subject, message content, and optionally upload a header
                image.
              </li>
              <li>
                <span className="text-white font-bold">Select Audience:</span>{' '}
                Choose All Users, Waitlist, Course, or Role. If Course or Role,
                select the specific group.
              </li>
              <li>
                <span className="text-white font-bold">Choose Channels:</span>{' '}
                Decide if the announcement should also post to Global Chat.
              </li>
              <li>
                <span className="text-white font-bold">Send Campaign:</span>{' '}
                Click "Dispatch Campaign". The system will send messages in the
                background and show campaign status.
              </li>
              <li>
                <span className="text-white font-bold">Review History:</span>{' '}
                View sent campaigns and their status in the sidebar.
              </li>
            </ol>
            <p className="text-[11px] text-emerald-400 font-medium leading-relaxed mt-3">
              Tip: Targeting waitlisted students is effective for new course
              launches.
            </p>
          </div>
        </section>

        {/* Referral System Guide */}
        <section className="space-y-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 border border-amber-400/20 rounded-2xl flex items-center justify-center text-amber-400 shadow-2xl">
              <Users size={24} />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Referral System Guide
            </h2>
          </div>
          <HandbookCard
            icon={<Users size={20} className="text-amber-400" />}
            title="Earn by Referring"
            description="Invite new users to the platform and earn commissions. Track your earnings, request payouts, and view your referral history. Admins can manage payouts and review flagged referrals."
          />
          <div className="bg-zinc-900/50 border border-amber-400/10 rounded-[32px] p-8 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              Step-by-Step: Using the Referral Page
            </h3>
            <ol className="space-y-4 text-zinc-400 text-sm leading-relaxed list-decimal ml-6">
              <li>
                <span className="text-white font-bold">
                  Generate Your Referral Code:
                </span>{' '}
                If you don’t have a code, click the button to generate one.
                Share this code with new users to earn rewards.
              </li>
              <li>
                <span className="text-white font-bold">
                  Track Your Earnings:
                </span>{' '}
                View your commission balance and referral history in the
                dashboard.
              </li>
              <li>
                <span className="text-white font-bold">Request a Payout:</span>{' '}
                When you have a balance, click “Request Payout” to withdraw your
                earnings. Fill out the required details in the modal.
              </li>
              <li>
                <span className="text-white font-bold">
                  Admin Dashboard (Admins/Maintainers only):
                </span>{' '}
                If you are an admin, you’ll see extra tabs:
                <ul className="list-disc ml-6 mt-2 space-y-2">
                  <li>
                    <span className="text-white font-bold">Leaderboard:</span>{' '}
                    View top referrers and total stats.
                  </li>
                  <li>
                    <span className="text-white font-bold">
                      Payout Approvals:
                    </span>{' '}
                    Approve or reject payout requests from users.
                  </li>
                  <li>
                    <span className="text-white font-bold">Fraud Review:</span>{' '}
                    Review flagged referrals with high fraud scores for
                    potential abuse.
                  </li>
                </ul>
              </li>
              <li>
                <span className="text-white font-bold">Get Notified:</span> All
                actions (code generation, payout, admin actions) provide instant
                feedback via notifications.
              </li>
            </ol>
            <p className="text-[11px] text-amber-400 font-medium leading-relaxed mt-3">
              Tip: Share your referral code widely to maximize your earnings.
              Admins should regularly review flagged referrals for fraud
              prevention.
            </p>
          </div>
        </section>

        {/* Future Guides Placeholder */}
        <div className="pt-12 border-t border-white/5 opacity-50">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 text-center">
            More modules coming soon: Assignment Grading, and Student
            Mentorship.
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
