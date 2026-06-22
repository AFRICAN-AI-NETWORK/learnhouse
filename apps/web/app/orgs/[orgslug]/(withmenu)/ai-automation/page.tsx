'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Bot,
  Code2,
  Rocket,
  Laptop,
  DollarSign,
  MonitorPlay,
  Package,
  Clock,
  Calendar,
  Zap,
  Wrench,
  Link2,
  MessageCircle,
  Smile,
  BarChart,
  Monitor,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'
import ClickToPayButton from '@components/Landings/ClickToPayButton'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function AIAutomationPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  const modules = [
    {
      num: 1,
      title: 'Introduction to AI Automation',
      week: 'Week 1',
      details: [
        'The business case for automation and identifying automation opportunities',
        'AI governance fundamentals and responsible automation',
        'Understanding the automation landscape: no-code, low-code, and code-based approaches',
        'Mapping business processes to automation candidates',
      ],
    },
    {
      num: 2,
      title: 'AI Tools and APIs',
      week: 'Week 2-3',
      details: [
        'Working directly with large language models (GPT-4, Claude) and the OpenAI API',
        'Open-source and African-language-friendly alternatives via Hugging Face',
        'API authentication, rate limiting, and cost management',
        'Building your first AI-powered API integration',
      ],
    },
    {
      num: 3,
      title: 'No-Code Workflow Platforms',
      week: 'Week 4-5',
      details: [
        'Building real, live automations in Zapier and Make.com',
        'Connecting Gmail, Slack, OpenAI, and more into seamless workflows',
        'Multi-step automation design and error handling',
        'Cost optimisation for platform-based automations',
      ],
    },
    {
      num: 4,
      title: 'n8n Mastery & Chatbots',
      week: 'Week 5-7',
      details: [
        'n8n: the free, open-source automation powerhouse with 9,500+ integrations',
        'Ideal for cost-conscious and privacy-conscious African deployments',
        'Building real, deployed chatbots on Telegram and WhatsApp',
        'Autonomous AI agents and human-in-the-loop safety design',
      ],
    },
    {
      num: 5,
      title: 'Advanced Workflow Automation',
      week: 'Week 7-8',
      details: [
        'Google Workspace automation at scale',
        'Retrieval-Augmented Generation (RAG) for AI that actually knows your business and local context',
        'Cost optimisation across platforms',
        'Building production-ready automation systems',
      ],
    },
    {
      num: 6,
      title: 'Robotic Process Automation (RPA)',
      week: 'Week 9',
      details: [
        'Automating legacy systems and government portals that have no API at all',
        'Using free open-source tools like TagUI',
        "Directly solving one of Africa's most persistent digital infrastructure gaps",
        'Building resilient RPA workflows for unreliable systems',
      ],
    },
    {
      num: 7,
      title: 'Ethics, Privacy & African Context',
      week: 'Week 10',
      details: [
        'NDPR/POPIA compliance for automated systems',
        'Algorithmic bias detection and mitigation',
        'Designing AI for 2G/low-bandwidth, multilingual African realities',
        'Data sovereignty and privacy-first automation design',
      ],
    },
    {
      num: 8,
      title: 'Capstone Project',
      week: 'Week 11-12',
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
      label: 'Non-technical professionals',
      color: 'bg-purple-50 text-purple-700',
    },
    { label: 'Entrepreneurs & founders', color: 'bg-amber-50 text-amber-700' },
    { label: 'Small business owners', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Freelancers & consultants', color: 'bg-blue-50 text-blue-700' },
    {
      label: 'Marketing & operations teams',
      color: 'bg-rose-50 text-rose-700',
    },
    { label: 'AAN Open graduates', color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-[#0057ff]/20"
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-600/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest border border-purple-500/30">
                <Bot size={14} /> Program 2
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                AI Automation
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mt-1">
                  Where Skills Become Income
                </span>
              </h1>
              <p className="text-xl text-gray-300 leading-relaxed max-w-xl">
                A practical, hands-on, fully self-paced 12-week programme that
                takes you from &ldquo;I understand AI&rdquo; to &ldquo;I have
                built and deployed real, working AI-powered automations that
                solve actual business problems.&rdquo;
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <MonitorPlay size={16} className="text-gray-400" /> Self-Paced
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Package size={16} className="text-gray-400" /> 8 Modules
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Clock size={16} className="text-gray-400" /> 12 Weeks
                </span>
                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Calendar size={16} className="text-gray-400" /> Live +
                  Recorded
                </span>
              </div>
              <div className="pt-4">
                <Link
                  href="#curriculum"
                  className="inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)]"
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
                  <p className="text-5xl font-black text-white">
                    $37
                    <span className="text-xl font-bold text-gray-400">/mo</span>
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                      COMING LIVE IN 1 WEEK
                    </span>
                    <Countdown targetDate={LAUNCH_DATE} />
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    DURATION
                  </p>
                  <p className="text-lg font-bold text-white">12 Weeks</p>
                  <p className="text-sm text-gray-400">
                    3 months, fully self-paced
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    LEVEL
                  </p>
                  <p className="text-lg font-bold text-white">Intermediate</p>
                  <p className="text-sm text-gray-400">No coding required</p>
                </div>
                <div className="pt-2">
                  <ClickToPayButton
                    courseId="ai-automation-course-id"
                    courseName="AI Automation"
                    priceAmount={37}
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
            { word: 'Automate', sub: 'Real business workflows.' },
            { word: 'Deploy', sub: 'Live, working systems.' },
            { word: 'Earn', sub: 'From day one.' },
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
                What You&apos;ll Learn
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight uppercase">
                Practical skills you can{' '}
                <span className="text-[#0057ff]">monetise immediately.</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Build AI-powered automations using Zapier, Make.com, and n8n without writing code',
              'Deploy real chatbots on WhatsApp and Telegram, the platforms African businesses actually use',
              'Work directly with OpenAI API, GPT-4, Claude, and open-source models via Hugging Face',
              'Automate Google Workspace at scale and implement RAG for business-aware AI',
              'Build RPA solutions for legacy systems and government portals with no APIs',
              'Graduate with a deployed capstone project and professional portfolio',
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
                  className="text-purple-600 flex-shrink-0 mt-0.5"
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

      {/* ── Tools You'll Master ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            Tools You&apos;ll Master
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-12 uppercase">
            The exact tools{' '}
            <span className="text-[#0057ff]">professionals use.</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                name: 'OpenAI API',
                icon: <Bot size={24} className="text-purple-600" />,
              },
              {
                name: 'Zapier',
                icon: <Zap size={24} className="text-purple-600" />,
              },
              {
                name: 'Make.com',
                icon: <Wrench size={24} className="text-purple-600" />,
              },
              {
                name: 'n8n',
                icon: <Link2 size={24} className="text-purple-600" />,
              },
              {
                name: 'WhatsApp API',
                icon: <MessageCircle size={24} className="text-purple-600" />,
              },
              {
                name: 'Hugging Face',
                icon: <Smile size={24} className="text-purple-600" />,
              },
              {
                name: 'Google Workspace',
                icon: <BarChart size={24} className="text-purple-600" />,
              },
              {
                name: 'TagUI (RPA)',
                icon: <Monitor size={24} className="text-purple-600" />,
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-purple-200 transition-all"
              >
                {tool.icon}
                <span className="font-bold text-[14px] text-[#0a0f1e]">
                  {tool.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum (Expandable Modules) ── */}
      <section id="curriculum" className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Course Content
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
              12 weeks. Every week has a{' '}
              <span className="text-[#0057ff]">purpose.</span>
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-purple-600 uppercase tracking-wider mb-1">
                      {mod.week}
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
                          <span className="text-purple-600 mt-0.5 flex-shrink-0">
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

      {/* ── Who Should Enrol ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
              Who Should Enrol
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] leading-tight mb-4 uppercase">
              No coding <span className="text-[#0057ff]">required.</span>
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-md">
              This course is built for professionals who want to build real,
              income-generating automations without writing complex code.
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

      {/* ── Why $37/month ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            Value Breakdown
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-8 uppercase">
            Why $37/month is{' '}
            <span className="text-[#0057ff]">extraordinary.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <DollarSign size={22} />,
                title: 'Bootcamp-level depth at a fraction of the cost',
                desc: '12 weeks of fully detailed, professionally structured curriculum equivalent to bootcamps charging $1,500 to $3,000 for similar outcomes.',
              },
              {
                icon: <Code2 size={22} />,
                title: 'Live, working integrations',
                desc: 'Access to OpenAI, Google Workspace, WhatsApp Business API, Zapier, Make.com, and n8n, all configured and ready to use.',
              },
              {
                icon: <Rocket size={22} />,
                title: 'Portfolio-ready capstone',
                desc: 'A built capstone project you can show to employers or clients immediately, not a theoretical exercise.',
              },
              {
                icon: <Laptop size={22} />,
                title: 'Skills that pay back immediately',
                desc: 'Freelance income, consulting opportunities, or measurable productivity gains inside your own business, often paying back the entire course cost in a single client project.',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-[#f9fafb] p-8 rounded-2xl border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                    {item.icon}
                  </div>
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

      {/* ── Bonus: Internship & Laptop ── */}
      <section className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Rocket size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              Internship Programme
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Top-performing graduates get direct placement pathways with
              partner organisations for genuine, hands-on internship experience
              with real-world AI automation projects.
            </p>
          </div>
          <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm space-y-5">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Laptop size={24} />
            </div>
            <h3 className="text-xl font-black text-[#0a0f1e]">
              Laptop Giveaway Initiative
            </h3>
            <p className="text-gray-500 text-[15px] leading-relaxed">
              Students who exceed 80% engagement and performance become eligible
              for a free laptop, funded through AAN&apos;s sponsorship network.
              Excellence is rewarded with real opportunity.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pathway Preview ── */}
      <section className="py-24 px-6 lg:px-12 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest mb-4">
            The Full Pathway
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] mb-12 uppercase">
            Your position in the{' '}
            <span className="text-[#0057ff]">AAN journey</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                stage: 'Stage 1',
                name: 'AAN Open',
                sub: 'Generative AI Foundation',
                price: 'FREE',
                priceColor: 'text-emerald-500',
                active: false,
              },
              {
                stage: 'Stage 2',
                name: 'AI Automation',
                sub: '12-week hands-on programme',
                price: '$37/month',
                priceColor: 'text-[#0057ff]',
                active: true,
              },
              {
                stage: 'Stage 3',
                name: 'AI Fundamentals',
                sub: 'Machine Learning Engineering',
                price: '$40/month',
                priceColor: 'text-emerald-500',
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
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20'
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
                  <span className="inline-block mt-3 text-xs font-bold text-emerald-500 uppercase tracking-wider">
                    ← You are here
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-32 px-6 overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-purple-600/20 to-purple-400/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_rgba(147,51,234,0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-purple-600/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Sparkles size={14} className="text-purple-400" /> Turn Skills
              Into Income
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Build. Automate. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Get Paid.
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              12 weeks. 8 modules. One deployed capstone. Real automations for
              real businesses at $37/month.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-purple-600 text-white rounded-xl font-bold text-[15px] hover:bg-purple-700 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)] flex items-center justify-center gap-3"
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
