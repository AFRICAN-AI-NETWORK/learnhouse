'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Link2,
  Share2,
  DollarSign,
  Users,
  Sparkles,
  TrendingUp,
  Gift,
} from 'lucide-react'
import Link from 'next/link'

export default function ReferAndEarnSection() {
  const steps = [
    {
      icon: <Link2 size={24} />,
      title: 'Generate Link',
      desc: 'Anyone can generate a unique referral link from the LMS.',
    },
    {
      icon: <Share2 size={24} />,
      title: 'Share Anywhere',
      desc: 'Share on WhatsApp status, Instagram bio, TikTok, Twitter/X, or your classroom.',
    },
    {
      icon: <DollarSign size={24} />,
      title: 'Earn $4 per Sign-Up',
      desc: 'For every new learner who signs up and enrols, you earn $4 per successful referral.',
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'No Limits',
      desc: 'No cap, no special qualification required, and no limit on how many you can refer.',
    },
  ]

  const earnings = [
    { referrals: '50', amount: '$200' },
    { referrals: '500', amount: '$2,000' },
    { referrals: '1,000', amount: '$4,000' },
    { referrals: '5,000', amount: '$20,000', highlight: true },
    { referrals: '10,000', amount: '$40,000', highlight: true },
  ]

  return (
    <section className="py-24 px-6 lg:px-12 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left: Text & Steps */}
          <div className="flex-1 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
                <Gift size={14} /> Refer & Earn
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#0a0f1e] leading-tight mb-4">
                Turn Your Network <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-[#4da6ff]">
                  Into Income.
                </span>
              </h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Available directly inside the LMS, AAN&apos;s Refer & Earn
                programme is one of the most generous and accessible referral
                structures in African EdTech — and it is open to absolutely
                everyone, student or not.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-[#f9fafb] p-6 rounded-2xl border border-gray-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#0057ff]/10 text-[#0057ff] flex items-center justify-center mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#0a0f1e] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-3 bg-[#0a0f1e] hover:bg-[#1a1f2e] text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all shadow-md"
              >
                Get Your Referral Link <Share2 size={18} />
              </Link>
            </div>
          </div>

          {/* Right: The Maths Card */}
          <div className="w-full lg:w-[480px] flex-shrink-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-[#0a0f1e] to-[#111827] rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#0057ff]/20 blur-[100px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#0057ff]/20 flex items-center justify-center text-[#4da6ff]">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">
                      The Creator Maths
                    </h3>
                    <p className="text-[#4da6ff] text-sm font-bold">
                      At $4 per referral
                    </p>
                  </div>
                </div>

                <p className="text-gray-400 text-[15px] leading-relaxed mb-8">
                  This is real cash, available to literally anyone. A single
                  influencer with an engaged audience of even a few thousand
                  followers could realistically generate life-changing income.
                </p>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider px-4 pb-2 border-b border-white/10">
                    <span>Referrals</span>
                    <span>Earnings</span>
                  </div>
                  {earnings.map((row, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl transition-colors ${
                        row.highlight
                          ? 'bg-[#0057ff]/20 border border-[#0057ff]/30 text-[#4da6ff]'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="font-medium flex items-center gap-2">
                        <Users
                          size={14}
                          className={
                            row.highlight ? 'text-[#4da6ff]' : 'text-gray-500'
                          }
                        />
                        {row.referrals}
                      </span>
                      <span
                        className={`font-black ${row.highlight ? 'text-[#4da6ff] text-lg' : 'text-white'}`}
                      >
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-400 leading-relaxed italic">
                    &ldquo;A model very few, if any, AI education providers on
                    the continent have replicated at this level of openness and
                    reward.&rdquo;
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
