'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  BookOpen,
  Shield,
  Wrench,
  PenTool,
  Zap,
  Globe,
  Users,
  Laptop,
  MonitorPlay,
  Package,
  Clock,
  Calendar,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'

export default function AANOpenPage() {
  const org = useOrg() as any
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)

  const tracks = [
    {
      num: 1,
      title: 'AI Prompt Engineering',
      icon: <Sparkles size={22} />,
      summary:
        'The single highest-leverage skill in the AI economy, taught as a structured discipline.',
      details: [
        'Structuring prompts using frameworks like role-context-instruction-format',
        'Iterating and refining outputs for precision and quality',
        'Building reusable prompt templates for recurring tasks',
        'Advanced multi-step and chain-of-thought prompting techniques',
        'Real-world prompt engineering for business, content, and research',
      ],
    },
    {
      num: 2,
      title: 'AI Ethics',
      icon: <Shield size={22} />,
      summary:
        'A full track on responsible AI, with specific attention to African contexts and regulations.',
      details: [
        'Data privacy, bias and fairness, misinformation risks',
        'Intellectual property considerations for AI-generated content',
        "African regulatory frameworks: Nigeria's NDPR, Kenya's Data Protection Act, South Africa's POPIA",
        'Social and economic implications of AI adoption in Africa',
        'Building frameworks for responsible AI that African practitioners can lead globally',
      ],
    },
    {
      num: 3,
      title: 'AI Tools Mastery',
      icon: <Wrench size={22} />,
      summary:
        "Hands-on mastery of the AI tool landscape, backed by AAN's continent-leading AI Tools Directory.",
      details: [
        'Writing assistants and text generation tools',
        'Image and design generators for creative professionals',
        'Research, summarisation, and analysis tools',
        'Transcription and meeting productivity tools',
        "Guided by AAN's curated directory of 2,302+ AI tools across 66 sectors",
      ],
    },
    {
      num: 4,
      title: 'AI for Content Creation',
      icon: <PenTool size={22} />,
      summary:
        'Turn AI into a content engine for scriptwriting, social media, design, and engagement.',
      details: [
        'AI-powered scriptwriting and copywriting workflows',
        'Social media content calendars and caption generation',
        'Design ideation and visual content creation with AI',
        'Repurposing one piece of content into ten across platforms',
        'Directly translating AI skills into more output, engagement, and income',
      ],
    },
    {
      num: 5,
      title: 'AI for Research & Everyday Productivity',
      icon: <Zap size={22} />,
      summary:
        'Transform AI into a genuine daily productivity multiplier, not a novelty.',
      details: [
        'Literature review and research synthesis with AI',
        'Document summarisation and key insight extraction',
        'Meeting notes, action items, and follow-up automation',
        'Email drafting and professional communication',
        'Decision support and strategic analysis tools',
      ],
    },
  ]

  const audienceGroups = [
    {
      label: 'Entrepreneurs & business owners',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Content creators & marketers',
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Students & recent graduates',
      color: 'bg-emerald-50 text-emerald-700',
    },
    { label: 'Working professionals', color: 'bg-purple-50 text-purple-700' },
    { label: 'Developers exploring AI', color: 'bg-rose-50 text-rose-700' },
    { label: 'Anyone curious about AI', color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-[#0057ff]/20"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-28 px-6 lg:px-12 bg-[#0a0f1e] overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#0057ff]/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            {/* Left: Text */}
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/20 text-[#0057ff] text-xs font-bold uppercase tracking-widest border border-[#0057ff]/30">
                <BookOpen size={14} /> Program 1
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                AAN Open
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-[#4da6ff] mt-1">
                  Generative AI
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                The complete, multi-track Generative AI foundation programme
                covering everything a modern African professional needs to
                thrive in the AI era.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MonitorPlay size={16} className="text-gray-400" /> Self-Paced
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Package size={16} className="text-gray-400" /> 5 Tracks
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" /> Lifetime Access
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Calendar size={16} className="text-gray-400" /> Start Anytime
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-[#0057ff] hover:bg-[#0046cc] text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(0,87,255,0.5)]"
                >
                  View Curriculum <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Right: Price Card */}
            <div className="w-full lg:w-[320px] flex-shrink-0">
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-[24px] p-8 space-y-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    COURSE FEE
                  </p>
                  <p className="text-5xl font-black text-white">FREE</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Open Enrolment
                    </span>
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    FUTURE PRICE
                  </p>
                  <p className="text-2xl font-bold text-white/60 line-through">
                    $20/month
                  </p>
                  <p className="text-sm text-gray-400">
                    Lock in free access today
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    LEVEL
                  </p>
                  <p className="text-lg font-bold text-white">Beginner</p>
                  <p className="text-sm text-gray-400">No experience needed</p>
                </div>
                <Link
                  href="/auth/signup"
                  className="block w-full text-center bg-[#0057ff] hover:bg-[#0046cc] text-white py-4 rounded-xl font-bold text-[15px] transition-all"
                >
                  Enrol Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars Section ── */}
      <section className="py-20 px-6 lg:px-12 bg-[#f9fafb] border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {[
            { word: 'Learn', sub: 'Structured AI skills.' },
            { word: 'Build', sub: 'Real-world outputs.' },
            { word: 'Thrive', sub: 'Career-ready confidence.' },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex-1 p-8 bg-white border border-gray-100 rounded-2xl shadow-sm"
            >
              <h3 className="text-3xl font-black text-[#0a0f1e] mb-2">
                {p.word}
              </h3>
              <p className="text-gray-500 text-[15px]">{p.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── What You'll Learn (Tracks / Curriculum) ── */}
      <section id="curriculum" className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Course Content
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              5 tracks. Every track has a{' '}
              <span className="text-[#0057ff]">purpose.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {tracks.map((track) => (
              <motion.div
                key={track.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() =>
                    setExpandedTrack(
                      expandedTrack === track.num ? null : track.num
                    )
                  }
                  className="w-full flex items-center gap-5 p-6 md:p-8 text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#0057ff]/10 flex items-center justify-center text-[#0057ff] font-black text-lg">
                    {track.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[#0057ff] uppercase tracking-wider mb-1">
                      Track {track.num}
                    </p>
                    <h3 className="text-lg font-bold text-[#0a0f1e]">
                      {track.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                      expandedTrack === track.num ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedTrack === track.num && (
                  <div className="px-6 md:px-8 pb-8 border-t border-gray-100">
                    <p className="text-gray-500 text-[15px] leading-relaxed mt-6 mb-6">
                      {track.summary}
                    </p>
                    <ul className="space-y-3">
                      {track.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-[#0057ff] mt-0.5 flex-shrink-0">
                            →
                          </span>
                          <span className="text-[15px] text-gray-700">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who Should Take This ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Who Should Enrol
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight mb-4 uppercase">
              Created for <span className="text-[#0057ff]">Everyone</span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-md">
              You do not need any prior tech experience. Whether you are a
              student, creator, or business owner, AAN Open meets you where you
              are.
            </p>
          </div>
          <div className="flex-1 flex flex-wrap gap-3">
            {audienceGroups.map((group, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                viewport={{ once: true }}
                className={`px-5 py-3 rounded-full text-sm font-bold ${group.color}`}
              >
                {group.label}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Tools Directory ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[#0a0f1e] to-[#111827] rounded-[28px] p-10 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#0057ff]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20">
                  <Globe size={14} /> Included Free
                </div>
                <h3 className="text-3xl md:text-4xl font-black leading-tight">
                  AAN AI Tools Directory
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed">
                  The largest curated AI tools directory on the African
                  continent:{' '}
                  <strong className="text-white">2,302 AI tools</strong> across{' '}
                  <strong className="text-white">66 specialised sectors</strong>
                  , freely accessible to anyone.
                </p>
                <p className="text-gray-400 text-[15px] leading-relaxed">
                  Tools are surfaced and recommended directly inside our
                  curriculum so learners are never just handed a list, they are
                  taught how and why to use the right tool for their specific
                  goal.
                </p>
              </div>
              <div className="flex-shrink-0 grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6">
                  <p className="text-3xl font-black text-[#0057ff]">2,302</p>
                  <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                    AI Tools
                  </p>
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6">
                  <p className="text-3xl font-black text-[#0057ff]">66</p>
                  <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                    Sectors
                  </p>
                </div>
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 col-span-2">
                  <p className="text-3xl font-black text-emerald-400">FREE</p>
                  <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-wider">
                    For Everyone
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why This Is Extraordinary Value ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            Why AAN Open
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-8 uppercase">
            Extraordinary value.{' '}
            <span className="text-[#0057ff]">Seriously.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: '5 full tracks at zero cost',
                desc: 'Prompt engineering, ethics, tools, content, and productivity. Competitors charge $50 to $200 for a single isolated course covering less than this.',
              },
              {
                title: 'Future-proof pricing',
                desc: 'Even at its future price of $20/month, AAN Open remains dramatically below market for the depth and breadth delivered.',
              },
              {
                title: 'Africa-first by design',
                desc: 'African use cases, African regulations, African pricing. Not a Silicon Valley curriculum with an African label.',
              },
              {
                title: 'A launchpad, not a paywall',
                desc: 'We believe the entry point to AI literacy in Africa should never be a financial barrier. AAN Open is the on-ramp to a complete AI career pathway.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2
                    className="text-[#0057ff] flex-shrink-0 mt-1"
                    size={22}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-[#0a0f1e] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 text-[15px] leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Comes Next (Pathway Preview) ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            The Full Pathway
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-12 uppercase">
            Where AAN Open <span className="text-[#0057ff]">leads you</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                stage: 'Stage 1',
                name: 'AAN Open',
                sub: 'Generative AI Foundation',
                price: 'FREE',
                priceColor: 'text-emerald-500',
                active: true,
              },
              {
                stage: 'Stage 2',
                name: 'AI Automation for Businesses',
                sub: '12-week hands-on programme',
                price: '$37/month',
                priceColor: 'text-[#0057ff]',
                active: false,
              },
              {
                stage: 'Stage 3',
                name: 'AI Automation for Content Creators',
                sub: '12-week hands-on programme',
                price: '$37/month',
                priceColor: 'text-[#0057ff]',
                active: false,
              },
              {
                stage: 'Stage 4',
                name: 'AI Fundamentals',
                sub: 'Data Scientist',
                price: '$40/month',
                priceColor: 'text-[#0057ff]',
                active: false,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                viewport={{ once: true }}
                className={`p-8 rounded-2xl border ${
                  item.active
                    ? 'border-[#0057ff] bg-[#0057ff]/5 ring-2 ring-[#0057ff]/20'
                    : 'border-gray-200 bg-[#f9fafb]'
                }`}
              >
                <p className="text-xs font-bold text-[#0057ff] uppercase tracking-wider mb-2">
                  {item.stage}
                </p>
                <h3 className="text-xl font-black text-[#0a0f1e] mb-1">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{item.sub}</p>
                <p className={`text-2xl font-black ${item.priceColor}`}>
                  {item.price}
                </p>
                {item.active && (
                  <span className="inline-block mt-3 text-xs font-bold text-[#0057ff] uppercase tracking-wider">
                    ← You are here
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bonus: Community & Mobile-First ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#0057ff]/10 flex items-center justify-center text-[#0057ff]">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              30,000+ Member Community
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Representatives across multiple African countries. Discord,
              WhatsApp, LinkedIn, and more. Real community, not a comments
              section.
            </p>
          </div>
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-[#0057ff]/10 flex items-center justify-center text-[#0057ff]">
              <Laptop size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              Mobile-First Learning
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Fully responsive, mobile-optimised LMS with offline learning
              capability in development. Built for how Africa actually accesses
              the internet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-[#0057ff]/20 to-[#0057ff]/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(0,87,255,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-[#0057ff]/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />

          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Sparkles size={14} className="text-[#0057ff]" /> Zero Cost, Full
              Value
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Start Your AI <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-[#4da6ff]">
                Journey Today
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Five complete tracks. Zero cost. The most comprehensive free AI
              education programme on the continent.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-[#0057ff] text-white rounded-xl font-bold text-[15px] hover:bg-[#0046cc] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(0,87,255,0.5)] flex items-center justify-center gap-3"
              >
                Enrol Now, It&apos;s Free <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
