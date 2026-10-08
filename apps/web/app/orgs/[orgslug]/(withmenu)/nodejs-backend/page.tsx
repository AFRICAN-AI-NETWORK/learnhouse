'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lock,
  Target,
  Zap,
  Briefcase,
  Database,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import ClickToPayButton from '@components/Landings/ClickToPayButton'

export default function NodejsBackendPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

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
      icon: <Zap size={24} className="text-indigo-500" />,
      label: 'Frontend Developers',
      description:
        'Expand your skillset by mastering the server-side to build complete applications end-to-end.',
    },
    {
      icon: <Target size={24} className="text-indigo-500" />,
      label: 'Aspiring Backend Engineers',
      description:
        'Start from scratch and learn how databases, servers, and APIs work together securely.',
    },
    {
      icon: <Briefcase size={24} className="text-indigo-500" />,
      label: 'JavaScript Enthusiasts',
      description:
        'Take your JS knowledge from the browser to the server with Node.js and Express.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-indigo-500 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              Backend Track
            </span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
              3 Months • Virtual
            </span>
          </div>

          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            Backend
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-500">
              Development
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              Master scalable server-side development in this 3-month track.
              Build robust RESTful APIs, manage databases with Prisma and
              PostgreSQL, and deploy production-ready Node.js applications.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
              >
                View Syllabus <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrated Pricing Pitch ── */}
      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-50 border border-indigo-500/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />

            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> AINA Pro Subscription
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                Unlock Backend + 6 Premium Courses
              </h3>
              <p className="text-zinc-600 font-medium max-w-xl text-lg">
                Get full access to the entire AINA curriculum, mentorship, and
                guaranteed internship placement for one flat monthly rate.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black">$10</span>
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm">
                  / month
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-6">
                Cancel anytime.
              </p>
              <div className="w-full lg:w-64">
                <ClickToPayButton
                  courseId="aina-pro-subscription"
                  courseName="AINA Pro Subscription"
                  priceAmount={10}
                  currency="USD"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-indigo-600/70 font-bold uppercase tracking-widest">
                <Lock size={12} /> Secure Checkout
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Should Enroll ── */}
      <section className="py-24 px-6 lg:px-12 bg-white border-t border-zinc-100">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-6">
              Who Should <span className="text-indigo-500">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  {group.icon}
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">
                  {group.label}
                </h3>
                <p className="text-zinc-500 leading-relaxed font-medium">
                  {group.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Asymmetric Pillars ── */}
      <section className="py-24 px-6 lg:px-12 bg-black text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
              What You'll
              <br /> Learn
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-indigo-500/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block mb-4">
                  01
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Build
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Construct robust, secure RESTful APIs from scratch using
                  Node.js and the Express framework.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block mb-4">
                  02
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Scale
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Design complex relational databases with PostgreSQL, interact
                  via Prisma ORM, and master caching with Redis for
                  high-performance applications.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-indigo-950/30 border border-indigo-500/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block mb-4">
                03
              </span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">
                Deploy
              </h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Containerize your applications with Docker, implement automated
                CI/CD pipelines, and deploy production-ready cloud services.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Brutalist Curriculum ── */}
      <section id="curriculum" className="py-32 px-6 lg:px-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              Syllabus
            </h2>
          </div>

          <div className="border-t-2 border-black">
            {modules.map((mod) => (
              <div key={mod.num} className="border-b-2 border-black group">
                <button
                  onClick={() =>
                    setExpandedModule(
                      expandedModule === mod.num ? null : mod.num
                    )
                  }
                  className="w-full flex items-center justify-between py-8 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-8 md:gap-16">
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-indigo-500 transition-colors">
                      0{mod.num}
                    </span>
                    <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
                      {mod.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={32}
                    className={`text-black transition-transform duration-500 ${expandedModule === mod.num ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedModule === mod.num && (
                  <div className="pl-16 md:pl-32 pb-12">
                    <ul className="space-y-4">
                      {mod.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <span className="text-indigo-500 font-black mt-1">
                            →
                          </span>
                          <span className="text-lg font-medium text-zinc-600 leading-relaxed">
                            {detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stark CTA ── */}
      <section className="py-40 px-6 lg:px-12 bg-zinc-100 border-t border-zinc-200 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br /> <span className="text-indigo-500">Commit?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-indigo-500 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-indigo-600 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]"
          >
            Join the Waitlist <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
