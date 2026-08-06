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
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import Countdown from '@components/Landings/Countdown'
import ClickToPayButton from '@components/Landings/ClickToPayButton'
import PriceDisplay from '@components/Landings/PriceDisplay'
import useSWR from 'swr'
import { getProductsByCourse } from '@services/payments/products'

const LAUNCH_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

export default function AIAutomationContentCreatorsPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)
  const [isSubscription, setIsSubscription] = useState(false)

  const courseId = '1fc9f960-3d69-4003-a2d9-2acc98d0ca48'

  const { data: products, isLoading } = useSWR(
    org ? [`/payments/${org.id}/courses/${courseId}/products`] : null,
    () => getProductsByCourse(org.id, courseId, undefined)
  )

  const productsList = Array.isArray(products?.data) ? products.data : []
  const oneTimeProduct = productsList.find(
    (p: any) => p.product_type === 'one_time'
  )
  const subscriptionProduct = productsList.find(
    (p: any) => p.product_type === 'subscription'
  )

  // Fallbacks if products aren't created yet
  const PRICE_ONE_TIME = oneTimeProduct?.price || 60
  const PRICE_SUBSCRIPTION = subscriptionProduct?.price || 20
  const ORIGINAL_PRICE_ONE_TIME = 111
  const ORIGINAL_PRICE_SUBSCRIPTION = 37

  const currentProduct = isSubscription ? subscriptionProduct : oneTimeProduct
  const PLAN_ID = currentProduct?.provider_product_id || ''

  const modules = [
    {
      num: 1,
      title: 'AI Content Strategy & Ideation',
      week: 'Week 1',
      details: [
        'Automating trend research and content ideation with AI',
        'Developing a distinct AI persona that matches your brand voice',
        'Planning content calendars with AI assistants',
        'Identifying automation opportunities in your creative workflow',
      ],
    },
    {
      num: 2,
      title: 'AI for Writing & Copywriting',
      week: 'Week 2-3',
      details: [
        'Using ChatGPT and Claude for scripting and storytelling',
        'Automating blog posts, newsletters, and social media copy',
        'Creating custom GPTs tailored for your brand voice',
        'SEO optimization with AI tools',
      ],
    },
    {
      num: 3,
      title: 'AI for Visual Content',
      week: 'Week 4-5',
      details: [
        'Image generation mastery with Midjourney and DALL-E 3',
        'Automating thumbnail creation and basic graphics',
        'AI-assisted photo editing and batch processing',
        'Maintaining visual consistency across platforms',
      ],
    },
    {
      num: 4,
      title: 'AI for Video & Audio Production',
      week: 'Week 5-7',
      details: [
        'Automating video editing with Opus Clip and Premiere AI features',
        'AI voice cloning and text-to-speech with ElevenLabs',
        'Automated captioning, B-roll generation, and localization',
        'Podcast automation and audio cleanup',
      ],
    },
    {
      num: 5,
      title: 'Workflow Automation Platforms',
      week: 'Week 7-8',
      details: [
        'Connecting your tools with Zapier and Make.com',
        'Automating content distribution across platforms',
        'Building content repurposing pipelines (e.g., YouTube -> Blog -> Twitter)',
        'Notification and approval workflows',
      ],
    },
    {
      num: 6,
      title: 'Advanced Content Operations',
      week: 'Week 9',
      details: [
        'Using n8n for custom content pipelines',
        'RSS feed automation and curation bots',
        'Automated social media listening and engagement',
        'Building a "second brain" for your content assets',
      ],
    },
    {
      num: 7,
      title: 'Ethics, Copyright & Authenticity',
      week: 'Week 10',
      details: [
        'Navigating copyright in the AI era',
        'Maintaining authenticity and human connection',
        'Disclosing AI use and adhering to platform guidelines',
        'Responsible AI content generation',
      ],
    },
    {
      num: 8,
      title: 'Capstone Project',
      week: 'Week 11-12',
      details: [
        'Build and deploy a fully automated end-to-end content engine',
        'From automated ideation to scheduled distribution',
        'Present a portfolio of AI-generated/assisted multimedia content',
        'A real portfolio piece to showcase your workflow',
      ],
    },
  ]

  const audienceGroups = [
    {
      label: 'Non-technical professionals',
      color: 'bg-[oklch(59.2%_.249_.584)]/10 text-[oklch(59.2%_.249_.584)]',
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[oklch(59.2%_.249_.584)]/15 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[oklch(59.2%_.249_.584)]/20 text-[oklch(59.2%_.249_.584)] text-xs font-bold uppercase tracking-widest border border-[oklch(59.2%_.249_.584)]/30">
                <Bot size={14} /> Program 2
              </div>
              <h1 className="text-4xl md:text-[56px] font-black text-white leading-[1.08] tracking-tight uppercase">
                AI Automation for Content Creators
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[oklch(59.2%_.249_.584)] to-pink-400 mt-1">
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
                  className="inline-flex items-center gap-3 bg-[oklch(59.2%_.249_.584)] hover:bg-[oklch(59.2%_.249_.584)] text-white px-8 py-4 rounded-xl font-bold text-[15px] transition-all hover:scale-105 shadow-[0_0_40px_-10px_oklch(59.2%_.249_.584_/_0.5)]"
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
                          ? 'bg-[oklch(59.2%_.249_.584)] text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Subscription
                    </button>
                    <button
                      onClick={() => setIsSubscription(false)}
                      className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                        !isSubscription
                          ? 'bg-[oklch(59.2%_.249_.584)] text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      One-time
                    </button>
                  </div>
                  {isLoading ? (
                    <div className="h-10 bg-white/10 animate-pulse rounded-lg mt-2 mb-4"></div>
                  ) : (
                    <PriceDisplay
                      basePriceUSD={
                        isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                      }
                      originalPriceUSD={
                        isSubscription ? ORIGINAL_PRICE_SUBSCRIPTION : ORIGINAL_PRICE_ONE_TIME
                      }
                      interval={isSubscription ? '/mo' : ''}
                    />
                  )}
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[oklch(59.2%_.249_.584)]/20 text-[oklch(59.2%_.249_.584)] text-xs font-bold uppercase tracking-wider w-max">
                      <span className="w-1.5 h-1.5 bg-[oklch(59.2%_.249_.584)] rounded-full animate-pulse" />
                      PRICE INCREASES IN
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
                    courseId={courseId}
                    courseName="AI Automation for Content Creators"
                    priceAmount={
                      isSubscription ? PRICE_SUBSCRIPTION : PRICE_ONE_TIME
                    }
                    currency="USD"
                    planId={isSubscription ? PLAN_ID : undefined}
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
              'Build a fully automated content engine from ideation to distribution',
              'Master AI writing tools to generate scripts, newsletters, and social media copy',
              'Create stunning AI-generated imagery and automate your visual branding',
              'Streamline video and audio production using AI editing and voice cloning',
              'Connect your creative tools using Zapier, Make.com, and n8n to save hours of manual work',
              'Navigate copyright, ethics, and platform guidelines while maintaining your authentic voice',
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
                  className="text-[oklch(59.2%_.249_.584)] flex-shrink-0 mt-0.5"
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
                name: 'ChatGPT & Claude',
                icon: (
                  <Bot size={24} className="text-[oklch(59.2%_.249_.584)]" />
                ),
              },
              {
                name: 'Midjourney',
                icon: (
                  <Smile size={24} className="text-[oklch(59.2%_.249_.584)]" />
                ),
              },
              {
                name: 'ElevenLabs',
                icon: (
                  <MessageCircle
                    size={24}
                    className="text-[oklch(59.2%_.249_.584)]"
                  />
                ),
              },
              {
                name: 'Opus Clip',
                icon: (
                  <MonitorPlay
                    size={24}
                    className="text-[oklch(59.2%_.249_.584)]"
                  />
                ),
              },
              {
                name: 'Zapier',
                icon: (
                  <Zap size={24} className="text-[oklch(59.2%_.249_.584)]" />
                ),
              },
              {
                name: 'Make.com',
                icon: (
                  <Wrench size={24} className="text-[oklch(59.2%_.249_.584)]" />
                ),
              },
              {
                name: 'n8n',
                icon: (
                  <Link2 size={24} className="text-[oklch(59.2%_.249_.584)]" />
                ),
              },
              {
                name: 'Notion AI',
                icon: (
                  <BarChart
                    size={24}
                    className="text-[oklch(59.2%_.249_.584)]"
                  />
                ),
              },
            ].map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
                className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md hover:border-[oklch(59.2%_.249_.584)]/20 transition-all"
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[oklch(59.2%_.249_.584)]/10 flex items-center justify-center text-[oklch(59.2%_.249_.584)] font-black text-lg">
                    {mod.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-[oklch(59.2%_.249_.584)] uppercase tracking-wider mb-1">
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
                          <span className="text-[oklch(59.2%_.249_.584)] mt-0.5 flex-shrink-0">
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
            Why{' '}
            <PriceDisplay
              basePriceUSD={37}
              interval="/month"
              hideSwitcher
              className="inline-flex items-center text-[#0a0f1e]"
              priceClassName="text-[inherit] font-bold"
            />{' '}
            is <span className="text-[#ff0066]">underpriced.</span>
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
                  <div className="w-10 h-10 rounded-xl bg-[oklch(59.2%_.249_.584)]/10 flex items-center justify-center text-[oklch(59.2%_.249_.584)] flex-shrink-0">
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
            <div className="w-12 h-12 rounded-xl bg-[oklch(59.2%_.249_.584)]/10 flex items-center justify-center text-[oklch(59.2%_.249_.584)]">
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
            <div className="w-12 h-12 rounded-xl bg-[oklch(59.2%_.249_.584)]/10 flex items-center justify-center text-[oklch(59.2%_.249_.584)]">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                priceColor: 'text-[oklch(59.2%_.249_.584)]',
                active: true,
              },
              {
                stage: 'Stage 4',
                name: 'AI Fundamentals',
                sub: 'Data Scientist',
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-[oklch(59.2%_.249_.584)]/20 to-[oklch(59.2%_.249_.584)]/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto bg-[#0a0f1e] rounded-[40px] p-12 md:p-20 text-center shadow-[0_20px_40px_-15px_oklch(59.2%_.249_.584_/_0.4)] overflow-hidden">
          <div className="absolute inset-0 bg-[oklch(59.2%_.249_.584)]/5 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest border border-white/20 backdrop-blur-md">
              <Sparkles size={14} className="text-[oklch(59.2%_.249_.584)]" />{' '}
              Turn Skills Into Income
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
              Build. Automate. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(59.2%_.249_.584)] to-pink-400">
                Get Paid.
              </span>
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              No code. Massive impact. From manual editing to automating real
              businesses at{' '}
              <PriceDisplay
                basePriceUSD={37}
                interval="/month"
                hideSwitcher
                className="inline-flex items-center text-[#ff0066] ml-1"
                priceClassName="text-[inherit]"
              />
              .
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-10 py-5 bg-[oklch(59.2%_.249_.584)] text-white rounded-xl font-bold text-[15px] hover:bg-[oklch(59.2%_.249_.584)] transition-all hover:scale-105 shadow-[0_0_40px_-10px_oklch(59.2%_.249_.584_/_0.5)] flex items-center justify-center gap-3"
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
