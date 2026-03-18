'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
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
  Quote,
  TrendingUp,
  Users as UsersIcon,
} from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'

// Background Textures
import heroBg from '@public/landing/hero_bg.png'
import programsBg from '@public/landing/programs_bg.png'
import roadmapBg from '@public/landing/roadmap_bg.png'
import specializationsBg from '@public/landing/specializations_bg.png'

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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={heroBg.src}
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#0a0a0a]" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-cyan-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-blue-500 text-xs font-black uppercase tracking-[0.2em] mb-8">
              <Sparkles size={14} /> The Future of Learning
            </span>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              Accelerate Your Career in the{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-800">
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
      <section
        id="available"
        className="relative py-24 px-6 border-t border-white/5 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={programsBg.src}
            alt=""
            className="w-full h-full object-cover opacity-[0.08]"
          />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Available Programs
            </h2>
            <p className="text-zinc-500 font-medium">
              Start learning today with our open access directory.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="group relative p-10 rounded-[40px] bg-zinc-900 border border-white/10 hover:border-blue-500/50 transition-all overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-20 transition-opacity">
                <Cpu size={160} />
              </div>
              <div className="relative z-10 space-y-8">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Cpu size={32} />
                </div>
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-widest">
                    Live Now
                  </div>
                  <h3 className="text-4xl font-black tracking-tight">
                    AAN OPEN
                  </h3>
                  <p className="text-zinc-400 text-lg leading-relaxed font-medium">
                    Your gateway to the AI ecosystem. Access our curated
                    directory of AI foundations and professional tools to
                    kickstart your journey.
                  </p>
                </div>
                <Link
                  href={getUriWithOrg(orgslug, '/course/aan-open')}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                >
                  Explore Directory <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Launching & Coming Soon */}
      <section
        id="roadmap"
        className="relative py-24 px-6 border-t border-white/5 bg-white/[0.01] overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={roadmapBg.src}
            alt=""
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Launching Soon */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <Rocket className="text-emerald-500" /> Launching Soon
                </h3>
                <p className="text-zinc-500 font-medium tracking-tight">
                  The core of our professional training curriculum.
                </p>
              </div>

              <div className="p-10 rounded-[40px] bg-zinc-900 border border-emerald-500/20 shadow-2xl shadow-emerald-500/5 space-y-8">
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
                    Professional Path
                  </span>
                  <h4 className="text-3xl font-black">AAN FUNDAMENTALS</h4>
                </div>
                <ul className="space-y-5">
                  {[
                    'Programming Essentials for AI',
                    'Mathematics for Machine Learning',
                    'Data Structures and Algorithms',
                    'Cloud Infrastructure',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-4 text-base font-bold text-zinc-300"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Coming Soon */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h3 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  <Timer className="text-amber-500" /> Coming Soon
                </h3>
                <p className="text-zinc-500 font-medium tracking-tight">
                  Advanced tracks for mastery and specialization.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="p-10 rounded-[40px] bg-zinc-900 border border-white/5 space-y-3 shadow-2xl hover:border-amber-500/30 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Mastery Track
                  </span>
                  <h4 className="text-2xl font-black">
                    AI MASTERY CERTIFICATE TRACK
                  </h4>
                </div>
                <div className="p-10 rounded-[40px] bg-zinc-900 border border-white/5 space-y-3 shadow-2xl hover:border-amber-500/30 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    Pro Series
                  </span>
                  <h4 className="text-2xl font-black">AAN AI PRO</h4>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tech Specializations */}
      <section
        id="specializations"
        className="relative py-24 px-6 bg-white/[0.02] border-t border-white/5 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={specializationsBg.src}
            alt=""
            className="w-full h-full object-cover opacity-[0.05]"
          />
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Tech Specializations
            </h2>
            <p className="text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
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
                className="p-6 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center text-center gap-4 hover:bg-zinc-800 transition-colors shadow-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                  {spec.icon ? (
                    <spec.icon size={24} />
                  ) : (
                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                  {spec.name}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-blue-600/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <h2 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
            Ready to Build the{' '}
            <span className="text-blue-500">Next Frontier?</span>
          </h2>
          <p className="text-xl text-zinc-400 font-medium max-w-2xl mx-auto">
            Join thousands of students across Africa mastering the future today.
            Free access to basic tools, premium training for future leaders.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
            >
              Get Started Now
            </Link>
            <Link
              href={getUriWithOrg(orgslug, '/courses')}
              className="w-full sm:w-auto px-12 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Sections from Org Config (Testimonials, Impact Metrics, etc.) */}
      {org?.config?.config?.landing?.sections?.map(
        (section: any, index: number) => {
          if (section.type === 'testimonials') {
            return (
              <section key={index} className="py-24 px-6 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <h2 className="text-4xl font-black tracking-tighter mb-4">
                      {section.title || 'What Our Students Say'}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {section.testimonials?.map((t: any, i: number) => (
                      <div
                        key={i}
                        className="p-8 rounded-[32px] bg-zinc-900/50 border border-white/5 relative"
                      >
                        <Quote
                          className="text-blue-500/20 absolute top-6 right-8"
                          size={40}
                        />
                        <p className="text-zinc-300 italic mb-6 relative z-10">
                          "{t.text}"
                        </p>
                        <div className="flex items-center gap-4">
                          {t.image_url && (
                            <img
                              src={t.image_url}
                              alt={t.author}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <p className="font-bold text-white">{t.author}</p>
                            <p className="text-xs text-zinc-500">{t.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (section.type === 'impact-metrics') {
            return (
              <section key={index} className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {section.metrics?.map((m: any, i: number) => (
                      <div key={i} className="text-center space-y-2">
                        <p className="text-5xl font-black text-blue-500">
                          {m.value}
                          {m.suffix}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (section.type === 'cta') {
            return (
              <section key={index} className="py-24 px-6 bg-blue-600/5">
                <div className="max-w-4xl mx-auto text-center space-y-8">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
                    {section.title}
                  </h2>
                  <p className="text-xl text-zinc-400">{section.description}</p>
                  {section.button && (
                    <Link
                      href={section.button.link || '#'}
                      className="inline-block px-12 py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all"
                    >
                      {section.button.text}
                    </Link>
                  )}
                </div>
              </section>
            )
          }

          return null
        }
      )}

      {/* Footer-like subtle branding */}
      <div className="py-12 border-t border-white/5 px-8 flex justify-between items-center opacity-30 select-none">
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">
          {org?.name || 'African AI Network'} {'// 2026'}
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
