'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lock,
  Target,
  Zap,
  Briefcase,
  Bot,
} from 'lucide-react'
import { useCurrency } from '@components/Contexts/CurrencyContext'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import ClickToPayButton from '@components/Landings/ClickToPayButton'

export default function AIAutomationBusinessesPage() {
  const org = useOrg() as any
  const { currency, convertAmount } = useCurrency()
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  const modules = [
    {
      num: 1,
      title: 'Introduction to AI Automation (Week 1)',
      details: [
        'The business case for automation and identifying automation opportunities',
        'AI governance fundamentals and responsible automation',
        'Understanding the automation landscape: no-code, low-code, and code-based approaches',
        'Mapping business processes to automation candidates',
      ],
    },
    {
      num: 2,
      title: 'AI Tools and APIs (Week 2-3)',
      details: [
        'Working directly with large language models (GPT-4, Claude) and the OpenAI API',
        'Open-source and African-language-friendly alternatives via Hugging Face',
        'API authentication, rate limiting, and cost management',
        'Building your first AI-powered API integration',
      ],
    },
    {
      num: 3,
      title: 'No-Code Workflow Platforms (Week 4-5)',
      details: [
        'Building real, live automations in Zapier and Make.com',
        'Connecting Gmail, Slack, OpenAI, and more into seamless workflows',
        'Multi-step automation design and error handling',
        'Cost optimisation for platform-based automations',
      ],
    },
    {
      num: 4,
      title: 'n8n Mastery & Chatbots (Week 5-7)',
      details: [
        'n8n: the free, open-source automation powerhouse with 9,500+ integrations',
        'Ideal for cost-conscious and privacy-conscious African deployments',
        'Building real, deployed chatbots on Telegram and WhatsApp',
        'Autonomous AI agents and human-in-the-loop safety design',
      ],
    },
    {
      num: 5,
      title: 'Advanced Workflow Automation (Week 7-8)',
      details: [
        'Google Workspace automation at scale',
        'Retrieval-Augmented Generation (RAG) for AI that actually knows your business and local context',
        'Cost optimisation across platforms',
        'Building production-ready automation systems',
      ],
    },
    {
      num: 6,
      title: 'Robotic Process Automation (RPA) (Week 9)',
      details: [
        'Automating legacy systems and government portals that have no API at all',
        'Using free open-source tools like TagUI',
        "Directly solving one of Africa's most persistent digital infrastructure gaps",
        'Building resilient RPA workflows for unreliable systems',
      ],
    },
    {
      num: 7,
      title: 'Ethics, Privacy & African Context (Week 10)',
      details: [
        'NDPR/POPIA compliance for automated systems',
        'Algorithmic bias detection and mitigation',
        'Designing AI for 2G/low-bandwidth, multilingual African realities',
        'Data sovereignty and privacy-first automation design',
      ],
    },
    {
      num: 8,
      title: 'Capstone Project (Week 11-12)',
      details: [
        'Design, build, document, and present a complete, deployed, end-to-end AI automation solution',
        '10-15 page professional report with architecture diagrams',
        'Recorded demo video showcasing your solution',
        'A real portfolio piece, not a toy exercise',
      ],
    },
  ]

  const audienceGroups = [
    {
      icon: <Briefcase size={24} className="text-purple-500" />,
      label: 'Founders & Business Owners',
      description:
        'Free yourself from manual admin so you can focus on growing your business and closing deals.',
    },
    {
      icon: <Target size={24} className="text-purple-500" />,
      label: 'Operations & Marketing Teams',
      description:
        '10x your output by letting AI handle data entry, lead qualification, and reporting.',
    },
    {
      icon: <Zap size={24} className="text-purple-500" />,
      label: 'Freelancers & Consultants',
      description:
        'Create new, highly-paid service offerings by building automations for clients.',
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-purple-500 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-500 text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              Program 2
            </span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
              12 Weeks • Self-Paced
            </span>
          </div>

          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            AI Automation
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
              For Businesses
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              From manual tasks to automated profits. Build real,
              income-generating automations without writing complex code.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-purple-600 transition-colors"
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
          <div className="bg-zinc-50 border border-purple-500/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />

            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-purple-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> AINA Pro Subscription
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                Unlock AI Automation + 6 Premium Courses
              </h3>
              <p className="text-zinc-600 font-medium max-w-xl text-lg">
                Get full access to the entire AINA curriculum, mentorship, and
                guaranteed internship placement for one flat monthly rate.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                  }).format(convertAmount(10))}
                </span>
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
              <div className="flex items-center gap-2 mt-4 text-xs text-purple-600/70 font-bold uppercase tracking-widest">
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
              Who Should <span className="text-purple-500">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-purple-500/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-purple-500 uppercase tracking-widest block mb-4">
                  01
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Connect
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Bridge tools together via Zapier, Make.com, and n8n to
                  eliminate manual data entry.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-purple-500 uppercase tracking-widest block mb-4">
                  02
                </span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">
                  Scale
                </h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Implement chatbots, autonomous agents, and RAG systems to
                  scale customer support and internal workflows.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-purple-950/30 border border-purple-500/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-purple-500 uppercase tracking-widest block mb-4">
                03
              </span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">
                Monetize
              </h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Build a portfolio of real, deployed solutions that can be
                immediately sold to clients or used to grow your own business.
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
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-purple-500 transition-colors">
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
                          <span className="text-purple-500 font-black mt-1">
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
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br /> <span className="text-purple-500">Commit?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-purple-500 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-purple-600 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)]"
          >
            Join the Waitlist <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
