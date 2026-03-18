'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Rocket,
  Timer,
  Cpu,
  Code2,
  Smartphone,
  Cloud,
  ShieldCheck,
  Palette,
  Layout,
  Video,
  BarChart3,
  Box,
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'

interface LandingPremiumProps {
  org: any
  courses: any[]
  collections: any[]
  orgslug: string
}

const techSpecializations = [
  { name: 'Full stack development', icon: Code2 },
  { name: 'Mobile App Development', icon: Smartphone },
  { name: 'Cloud Computing', icon: Cloud },
  { name: 'Cyber security', icon: ShieldCheck },
  { name: 'UI/UX Design', icon: Layout },
  { name: 'Graphic Design', icon: Palette },
  { name: 'Video Production and Editing', icon: Video },
  { name: 'Digital Marketing', icon: BarChart3 },
  { name: 'Product Management', icon: Box },
  { name: 'Project Management', icon: ClipboardList },
]

export default function LandingPremium({
  org,
  courses,
  collections,
  orgslug,
}: LandingPremiumProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-500/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-red-500 text-xs font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={14} /> The Future of Learning
            </span>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              Accelerate Your Career in the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">
                New Economy
              </span>
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              Master artificial intelligence, software engineering, and the most
              in-demand tech skills with {org?.name || 'African AI Network'}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                href={getUriWithOrg(orgslug, '/courses')}
                className="group px-8 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all"
              >
                Browse Programs{' '}
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <Link
                href="/auth/signup"
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Join the Community
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Available Now */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-16">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
                Available Programs
              </h2>
              <p className="text-zinc-500 font-medium">
                Start learning today with our open access directory.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              className="group relative p-8 rounded-[32px] bg-zinc-900/50 border border-white/5 hover:border-red-500/30 transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cpu size={120} />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
                  <Cpu size={28} />
                </div>
                <div>
                  <h3 className="text-3xl font-black mb-2">AAN OPEN</h3>
                  <p className="text-zinc-400 leading-relaxed font-medium">
                    Your gateway to the AI ecosystem. Access our curated
                    directory of AI foundations and professional tools to
                    kickstart your journey.
                  </p>
                </div>
                <Link
                  href={getUriWithOrg(orgslug, '/course/aan-open')}
                  className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Explore Directory <ArrowRight size={16} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Launching & Coming Soon */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Launching Soon */}
            <div className="space-y-12">
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <Rocket className="text-emerald-500" /> Launching Soon
                </h3>
                <p className="text-zinc-500 font-medium tracking-tight">
                  The core of our professional training curriculum.
                </p>
              </div>

              <div className="p-8 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
                <h4 className="text-2xl font-black">AAN FUNDAMENTALS</h4>
                <ul className="space-y-4">
                  {[
                    'Programming Essentials for AI',
                    'Mathematics for Machine Learning',
                    'Data Structures and Algorithms',
                    'Cloud Infrastructure',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-sm font-medium text-zinc-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{' '}
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="space-y-12">
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <Timer className="text-amber-500" /> Coming Soon
                </h3>
                <p className="text-zinc-500 font-medium tracking-tight">
                  Advanced tracks for mastery and specialization.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="p-8 rounded-[32px] bg-zinc-900/50 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Mastery Track
                  </span>
                  <h4 className="text-xl font-black">AI MASTERY CERTIFICATE</h4>
                </div>
                <div className="p-8 rounded-[32px] bg-zinc-900/50 border border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Pro Series
                  </span>
                  <h4 className="text-xl font-black">AAN AI PRO</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Specializations */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Tech Specializations
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto font-medium lead-relaxed">
              We prepare students for high-impact roles across the modern
              technology landscape.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {techSpecializations.map((spec, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-6 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col items-center text-center gap-4 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/50">
                  <spec.icon size={24} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {spec.name}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
            Ready to Build the{' '}
            <span className="text-red-500">Next Frontier?</span>
          </h2>
          <p className="text-xl text-zinc-400 font-medium">
            Join thousands of students across Africa mastering the future today.
            Free access to basic tools, premium training for future leaders.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest"
            >
              Get Started Now
            </Link>
            <Link
              href={getUriWithOrg(orgslug, '/courses')}
              className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer-like subtle branding */}
      <div className="py-12 border-t border-white/5 px-8 flex justify-between items-center opacity-30 select-none">
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">
          {org?.name || 'African AI Network'} // 2024
        </span>
        <div className="flex gap-6 uppercase tracking-[0.2em] font-black text-[9px]">
          <span>Security</span>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  )
}
