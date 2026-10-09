'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Link2,
  Share2,
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  ArrowRight,
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
    <section
      id="affiliate"
      className="py-32 px-6 lg:px-12 bg-white relative overflow-hidden"
    >
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white pointer-events-none" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#f0f5ff] text-[#0057ff] text-[13px] font-bold tracking-widest uppercase mb-6 shadow-sm border border-[#d6e4ff]">
            <Gift size={16} /> Affiliate Program
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[64px] font-bold text-[#111827] tracking-tight leading-[1.05] mb-8">
            Turn your network <br />
            <span className="text-[#0057ff]">into income.</span>
          </h2>
          <p className="text-[18px] text-[#555555] leading-[1.7]">
            Available directly inside the LMS, AINA&apos;s Refer & Earn
            programme is one of the most generous and accessible referral
            structures in African EdTech — open to absolutely everyone.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: Steps Grid */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f0f5ff] text-[#0057ff] flex items-center justify-center mb-6 shadow-inner">
                  {step.icon}
                </div>
                <h3 className="text-[18px] font-bold text-[#111827] mb-3">
                  {step.title}
                </h3>
                <p className="text-[15px] text-[#555555] leading-[1.7]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Right: The Maths Card (Premium Fintech Style) */}
          <div className="lg:col-span-5 w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-[#111827] rounded-[40px] p-8 md:p-12 shadow-[0_20px_60px_rgb(0,87,255,0.15)] relative overflow-hidden border border-gray-800"
            >
              {/* Glowing Orb */}
              <div className="absolute top-[-20%] right-[-20%] w-[300px] h-[300px] bg-[#0057ff] rounded-full blur-[120px] pointer-events-none opacity-40" />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-2xl">
                      Creator Maths
                    </h3>
                    <p className="text-[#60a5fa] text-[15px] font-bold">
                      Earn $4 per referral
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-10">
                  <div className="flex justify-between text-[13px] font-bold text-gray-500 uppercase tracking-wider px-2 pb-2 border-b border-gray-800">
                    <span>Referrals</span>
                    <span>Total Earnings</span>
                  </div>
                  {earnings.map((row, i) => (
                    <div
                      key={i}
                      className={`flex justify-between items-center px-4 py-4 rounded-2xl transition-colors ${
                        row.highlight
                          ? 'bg-[#0057ff] border border-blue-500 shadow-lg'
                          : 'bg-white/5 border border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className={`font-semibold flex items-center gap-3 text-[15px] ${row.highlight ? 'text-white' : 'text-gray-300'}`}
                      >
                        <Users
                          size={18}
                          className={
                            row.highlight ? 'text-white/80' : 'text-gray-500'
                          }
                        />
                        {row.referrals}
                      </span>
                      <span
                        className={`font-black text-[18px] ${row.highlight ? 'text-white' : 'text-white'}`}
                      >
                        {row.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth/signup"
                  className="w-full inline-flex items-center justify-center gap-3 bg-white text-[#111827] px-8 py-5 rounded-xl font-bold text-[16px] hover:bg-gray-100 transition-colors shadow-lg"
                >
                  Generate Referral Link <ArrowRight size={18} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
