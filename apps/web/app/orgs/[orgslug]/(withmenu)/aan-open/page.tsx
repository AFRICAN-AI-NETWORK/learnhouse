'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ChevronDown, Sparkles, Target, Zap, Briefcase, Brain, Code } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'

export default function AANOpenPage() {
  const org = useOrg() as any
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)

  const tracks = [
    {
      num: 1,
      title: 'AI Prompt Engineering',
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
      icon: <Briefcase size={24} className="text-blue-600" />,
      label: 'Entrepreneurs & Business Owners',
      description: 'Streamline operations, draft proposals instantly, and multiply your output without hiring.'
    },
    {
      icon: <Target size={24} className="text-blue-600" />,
      label: 'Content Creators & Marketers',
      description: 'Supercharge your content calendar, generate stunning visuals, and write copy 10x faster.'
    },
    {
      icon: <Brain size={24} className="text-blue-600" />,
      label: 'Students & Recent Graduates',
      description: 'Gain the ultimate competitive advantage in the job market before you even graduate.'
    },
    {
      icon: <Zap size={24} className="text-blue-600" />,
      label: 'Working Professionals',
      description: 'Automate mundane tasks, draft emails perfectly, and focus on high-leverage strategic work.'
    },
    {
      icon: <Code size={24} className="text-blue-600" />,
      label: 'Developers Exploring AI',
      description: 'Understand the landscape of AI tools and foundational prompt engineering before diving into code.'
    },
    {
      icon: <Sparkles size={24} className="text-blue-600" />,
      label: 'Anyone Curious About AI',
      description: 'Start from absolute zero and build genuine AI literacy in a structured, hype-free environment.'
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-blue-600 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-[0.2em]">Program 1</span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Self-Paced • 5 Tracks • Free</span>
          </div>
          
          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            AAN Open
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
              Generative AI
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              The complete, multi-track Generative AI foundation programme covering everything a modern African professional needs to thrive in the AI era.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-blue-600 transition-colors"
              >
                View Syllabus <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrated Pricing Pitch (FREE) ── */}
      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-zinc-50 border border-blue-600/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
            
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> Open Access
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                Start Your AI Journey For Free
              </h3>
              <p className="text-zinc-600 font-medium max-w-xl text-lg">
                We believe the entry point to AI literacy in Africa should never be a financial barrier. AAN Open is the zero-cost on-ramp to a complete AI career pathway.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black">$0</span>
                <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm">/ forever</span>
              </div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-6">No credit card required.</p>
              <div className="w-full lg:w-64">
                <Link
                  href="/auth/signup"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 font-bold text-sm uppercase tracking-widest transition-colors shadow-sm"
                >
                  Enrol Now For Free
                </Link>
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
              Who Should <span className="text-blue-600">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  {group.icon}
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">{group.label}</h3>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-blue-600/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-4">01</span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">Master</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  The fundamentals of prompt engineering. Move beyond basic chatbots and learn how to extract highly precise, structured outputs.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-4">02</span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">Discover</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Navigate the AAN AI Tools Directory of 2,300+ tools. Find the exact AI solutions for your specific industry and daily tasks.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-7 bg-blue-950/30 border border-blue-600/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block mb-4">03</span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">Apply</h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Turn AI into a tangible productivity multiplier. Whether for content creation, deep research, or business automation—learn to apply AI effectively and ethically.
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
              5 Tracks
            </h2>
          </div>

          <div className="border-t-2 border-black">
            {tracks.map((track) => (
              <div key={track.num} className="border-b-2 border-black group">
                <button
                  onClick={() => setExpandedTrack(expandedTrack === track.num ? null : track.num)}
                  className="w-full flex items-center justify-between py-8 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-8 md:gap-16">
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-blue-600 transition-colors">
                      0{track.num}
                    </span>
                    <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
                      {track.title}
                    </h3>
                  </div>
                  <ChevronDown
                    size={32}
                    className={`text-black transition-transform duration-500 ${expandedTrack === track.num ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandedTrack === track.num && (
                  <div className="pl-16 md:pl-32 pb-12">
                    <ul className="space-y-4">
                      {track.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <span className="text-blue-600 font-black mt-1">→</span>
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
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />
        
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br/> <span className="text-blue-600">Begin?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-blue-600 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-blue-700 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
          >
            Enrol For Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
