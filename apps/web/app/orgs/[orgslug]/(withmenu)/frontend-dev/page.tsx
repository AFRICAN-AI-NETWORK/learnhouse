'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Monitor,
  Package,
  Clock,
  Code,
  LayoutTemplate,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'
import ClickToPayButton from '@components/Landings/ClickToPayButton'
import PriceDisplay from '@components/Landings/PriceDisplay'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function FrontendDevPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)
  const [isSubscription, setIsSubscription] = useState(true)

  const courseId = 'frontend-dev-uuid' // Placeholder

  const PRICE_ONE_TIME = 60
  const PRICE_SUBSCRIPTION = 20
  const ORIGINAL_PRICE_ONE_TIME = 90
  const ORIGINAL_PRICE_SUBSCRIPTION = 30

  const modules = [
    {
      num: 1,
      title: 'Foundations (Month 1)',
      details: [
        'Web & Environment Setup: How the web works, VS Code, HTML5 basics',
        'CSS Deep Dive & Flexbox: Typography, Custom Properties, Layouts',
        'CSS Grid & Responsive Design: Media queries, Mobile-first philosophy, Animations',
        'Portfolio Capstone: Wireframing, Styling, Semantic HTML, GitHub Pages Deploy',
      ],
    },
    {
      num: 2,
      title: 'Core Dev Skills (Month 2)',
      details: [
        'JavaScript Foundations: Variables, Data types, Functions, Control flow',
        'The DOM & Events: Selection, Manipulation, Event Listeners, Forms, Local Storage',
        'Async JavaScript & APIs: Promises, Fetch API, REST Principles, dynamic rendering',
        'Git, GitHub & Pro Workflow: Branching, Pull Requests, ES Modules, clean commits',
      ],
    },
    {
      num: 3,
      title: 'React & Deploy (Month 3)',
      details: [
        'React Fundamentals: Component model, JSX, Props, Vite setup',
        'React Hooks & API Integration: useState, useEffect, useContext, Custom hooks',
        'React Router & Tailwind CSS: Multi-page apps, Utility-first CSS, Forms/Validation',
        'Capstone Project & Career Readiness: Build, polish, deploy, and interview prep',
      ],
    },
  ]

  const audienceGroups = [
    { label: 'Complete Beginners', color: 'bg-teal-50 text-teal-700' },
    {
      label: 'Aspiring Frontend Developers',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Designers learning to code',
      color: 'bg-purple-50 text-purple-700',
    },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-teal-500/20"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── Hero Section ── */}
      <section className="relative pt-36 pb-28 px-6 lg:px-12 bg-[#0a0f1e] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-teal-500/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-widest border border-teal-500/30">
                <LayoutTemplate size={14} /> Frontend Track
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                Frontend Developer
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mt-1">
                  Zero to Hero
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                A structured 3-month program from complete beginner to job-ready
                frontend developer. Master HTML, CSS, JavaScript, React, and
                Tailwind CSS.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Monitor size={16} className="text-gray-400" /> Virtual
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Package size={16} className="text-gray-400" /> 3 Modules
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" /> 3 Months
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Code size={16} className="text-gray-400" /> React/Tailwind
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-teal-500 hover:bg-teal-600 text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(20,184,166,0.5)]"
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
                    Tuition
                  </p>
                  <div className="mb-4 flex items-center p-1 bg-white/10 rounded-xl">
                    <button
                      onClick={() => setIsSubscription(true)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        isSubscription
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Subscription
                    </button>
                    <button
                      onClick={() => setIsSubscription(false)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        !isSubscription
                          ? 'bg-teal-500 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      One-time
                    </button>
                  </div>
                  <PriceDisplay
                    basePriceUSD={
                      isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                    }
                    originalPriceUSD={
                      isSubscription
                        ? ORIGINAL_PRICE_SUBSCRIPTION
                        : ORIGINAL_PRICE_ONE_TIME
                    }
                    interval={isSubscription ? '/mo' : ''}
                  />

                  <div className="mt-8 space-y-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                      COHORT STARTING SOON
                    </span>
                    <Countdown targetDate={LAUNCH_DATE} />
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="pt-2">
                  <ClickToPayButton
                    courseId={courseId}
                    courseName="Frontend Developer"
                    priceAmount={
                      isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                    }
                    currency="USD"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="py-20 px-6 lg:px-12 bg-[#f9fafb] border-b border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8">
          {[
            { word: 'Build', sub: 'Responsive websites from scratch.' },
            { word: 'Interact', sub: 'Clean, modern JavaScript & DOM.' },
            { word: 'Deploy', sub: 'Dynamic React applications.' },
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

      {/* ── What You'll Learn ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 mb-16 items-end">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-500 text-xs font-bold uppercase tracking-widest mb-4">
                What You&apos;ll Learn
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight uppercase">
                From beginner to{' '}
                <span className="text-teal-500">
                  job-ready frontend developer.
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Build responsive, accessible websites from scratch using semantic HTML5 and modern CSS',
              'Write clean, modern JavaScript (ES6+) for DOM manipulation and event handling',
              'Work professionally with Git & GitHub for version control and collaboration',
              'Build dynamic React applications with components, props, state, and hooks',
              'Integrate third-party REST APIs using fetch and async/await',
              'Deploy 3 portfolio-ready projects to Vercel or Netlify',
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-5 rounded-xl bg-[#f9fafb] border border-gray-100"
              >
                <CheckCircle2
                  className="text-teal-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <span className="text-[15px] text-gray-700 leading-relaxed">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum (Expandable Modules) ── */}
      <section
        id="curriculum"
        className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-500 text-xs font-bold uppercase tracking-widest mb-4">
              Curriculum
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              3 Phases. <span className="text-teal-500">Zero to Hero.</span>
            </h2>
          </div>

          <div className="space-y-4">
            {modules.map((mod) => (
              <motion.div
                key={mod.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow"
              >
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === mod.num ? null : mod.num
                    )
                  }
                  className="w-full flex items-center gap-5 p-6 md:p-8 text-left"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">
                      Phase {mod.num}
                    </p>
                    <h3 className="text-lg font-bold text-[#0a0f1e]">
                      {mod.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                      expandedModule === mod.num ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedModule === mod.num && (
                  <div className="px-6 md:px-8 pb-8 border-t border-gray-100">
                    <ul className="space-y-3 mt-6">
                      {mod.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-teal-600 mt-0.5 flex-shrink-0">
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

      {/* ── Final CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-teal-500/20 to-emerald-400/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(20,184,166,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-teal-500/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <LayoutTemplate size={14} className="text-teal-400" /> Start
              Building
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Become a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500">
                Frontend Developer
              </span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-teal-500 text-white rounded-xl font-bold text-[15px] hover:bg-teal-600 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(20,184,166,0.5)] flex items-center justify-center gap-3"
              >
                Join the Waitlist <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
