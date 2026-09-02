'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Database,
  Monitor,
  Package,
  Clock,
  Code,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'
import ClickToPayButton from '@components/Landings/ClickToPayButton'
import PriceDisplay from '@components/Landings/PriceDisplay'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function NodejsBackendPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)
  const [isSubscription, setIsSubscription] = useState(true)

  const courseId = 'nodejs-backend-uuid' // Placeholder

  const PRICE_ONE_TIME = 60
  const PRICE_SUBSCRIPTION = 20
  const ORIGINAL_PRICE_ONE_TIME = 90
  const ORIGINAL_PRICE_SUBSCRIPTION = 30

  const modules = [
    {
      num: 1,
      title: 'Backend Foundations (Month 1)',
      details: [
        'Intro to Web Dev & JS Basics: Frontend vs Backend, Client-Server Architecture, HTTP/HTTPS',
        'Advanced JavaScript: Scope, Closures, Hoisting, Promises, Async/Await',
        'Node.js Fundamentals: Event Loop, Single Thread Model, fs, path, os, http modules',
        'Git/GitHub & REST APIs: Branches, Pull Requests, HTTP Methods, Status Codes, Postman',
      ],
    },
    {
      num: 2,
      title: 'Backend with Express (Month 2)',
      details: [
        'Express Fundamentals & MVC: Routing, Middleware, Request/Response cycle',
        'Databases & Schema Design: SQL vs NoSQL, ER Diagrams',
        'PostgreSQL + Prisma ORM: Tables, relationships, migrations, models',
        'Authentication, JWT & RBAC: Auth vs Authorization, Password Hashing, JWT',
      ],
    },
    {
      num: 3,
      title: 'Advanced Backend (Month 3)',
      details: [
        'File Uploads & Email Systems: Image handling, Cloud Storage, Email Verification',
        'Pagination, Search & Redis Caching: Pagination, Filtering, Rate Limiting',
        'Security & Testing: Helmet, CORS, Data Validation, SQLi, XSS, Jest, Supertest',
        'Deployment, CI/CD & Capstone: Docker, Env Vars, Logging, CI/CD with GitHub Actions',
      ],
    },
  ]

  const audienceGroups = [
    {
      label: 'Frontend Developers going Fullstack',
      color: 'bg-emerald-50 text-emerald-700',
    },
    { label: 'Aspiring Backend Engineers', color: 'bg-blue-50 text-blue-700' },
    { label: 'JavaScript Enthusiasts', color: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-indigo-500/20"
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest border border-indigo-500/30">
                <Database size={14} /> Backend Track
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                Backend Development
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500 mt-1">
                  Node.js Edition
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                Master scalable server-side development in this 3-month track.
                Build robust RESTful APIs, manage databases with Prisma and
                PostgreSQL, and deploy production-ready Node.js applications.
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
                  <Code size={16} className="text-gray-400" /> Node.js/Express
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
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
                          ? 'bg-indigo-500 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Subscription
                    </button>
                    <button
                      onClick={() => setIsSubscription(false)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        !isSubscription
                          ? 'bg-indigo-500 text-white shadow-md'
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
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                      COHORT STARTING SOON
                    </span>
                    <Countdown targetDate={LAUNCH_DATE} />
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="pt-2">
                  <ClickToPayButton
                    courseId={courseId}
                    courseName="Node.js Backend"
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
            { word: 'Build', sub: 'Robust RESTful APIs with Express.' },
            { word: 'Scale', sub: 'Master caching, databases & performance.' },
            { word: 'Deploy', sub: 'Docker, CI/CD & Cloud.' },
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-widest mb-4">
                What You&apos;ll Learn
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight uppercase">
                From beginner to{' '}
                <span className="text-indigo-500">
                  job-ready Node.js developer.
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Master asynchronous JavaScript and Node.js fundamentals',
              'Build robust and scalable APIs using Express.js',
              'Design relational databases and interact using Prisma ORM with PostgreSQL',
              'Implement secure authentication and authorization with JWT',
              'Integrate caching with Redis and rate-limiting for high traffic',
              'Deploy applications using Docker and automated CI/CD pipelines',
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
                  className="text-indigo-500 flex-shrink-0 mt-0.5"
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-bold uppercase tracking-widest mb-4">
              Curriculum
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              3 Phases. <span className="text-indigo-500">Zero to Hero.</span>
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
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
                          <span className="text-indigo-600 mt-0.5 flex-shrink-0">
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-indigo-500/20 to-blue-400/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(99,102,241,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Database size={14} className="text-indigo-400" /> Start Building
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Become a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-500">
                Node.js Engineer
              </span>
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-indigo-500 text-white rounded-xl font-bold text-[15px] hover:bg-indigo-600 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] flex items-center justify-center gap-3"
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
