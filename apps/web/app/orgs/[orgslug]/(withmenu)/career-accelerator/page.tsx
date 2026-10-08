'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ChevronDown, Lock, Target, Zap, Briefcase, Award } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import GlobalFooter from '@components/Landings/GlobalFooter'
import ClickToPayButton from '@components/Landings/ClickToPayButton'

export default function CareerAcceleratorPage() {
  const org = useOrg() as any
  const [expandedModule, setExpandedModule] = useState<number | null>(null)

  const modules = [
    {
      num: 1,
      title: 'The Global Market & Professional Mindset',
      details: [
        'Understanding expectations in international tech and remote markets',
        'Professional ethics, accountability, and time management',
        'Transitioning from a local mindset to a global standard',
        'Managing imposter syndrome as an African talent',
      ],
    },
    {
      num: 2,
      title: 'Crafting a World-Class Portfolio',
      details: [
        'Structuring a resume that passes ATS (Applicant Tracking Systems)',
        'Building a high-conversion portfolio for developers, designers, and marketers',
        'Optimizing your LinkedIn profile for inbound recruiter outreach',
        'Showcasing real-world impact over generic project lists',
      ],
    },
    {
      num: 3,
      title: 'Interview Prep & Communication',
      details: [
        'Acing behavioral interviews using the STAR method',
        'Technical interview strategies for engineers and creatives',
        'Cross-cultural communication and remote collaboration',
        'Handling salary expectations and negotiations confidently',
      ],
    },
    {
      num: 4,
      title: 'Job Search Automation & Outreach',
      details: [
        'Systematizing your job hunt across multiple global platforms',
        'Cold email and direct outreach strategies that actually get replies',
        'Leveraging AI to tailor resumes and cover letters in minutes',
        'Building a pipeline of continuous opportunities',
      ],
    },
    {
      num: 5,
      title: 'Client Management & Freelancing',
      details: [
        'Navigating freelance platforms (Upwork, Toptal) vs direct clients',
        'Drafting contracts, setting boundaries, and managing scope creep',
        'Onboarding new clients and setting professional communication cadences',
        'Invoicing globally and managing cross-border payments',
      ],
    },
    {
      num: 6,
      title: 'Placement Preparation',
      details: [
        'Final mock interviews with industry experts',
        'Entry into the AINA Talent Pool for direct employer matching',
        'Understanding the AINA referral pipeline and placement criteria',
        'Post-placement support and surviving your first 90 days',
      ],
    },
  ]

  const audienceGroups = [
    {
      icon: <Briefcase size={24} className="text-amber-500" />,
      label: 'Developers & AI Engineers',
      description: 'You have the code skills. Now learn how to present them, pass the behavioral rounds, and land the high-paying remote role.'
    },
    {
      icon: <Target size={24} className="text-amber-500" />,
      label: 'Designers & Marketers',
      description: 'Stand out in a saturated market with a world-class portfolio and outbound strategy that gets you noticed.'
    },
    {
      icon: <Zap size={24} className="text-amber-500" />,
      label: 'Virtual Assistants',
      description: 'Elevate from basic admin to a high-value operational partner that international founders trust and rely on.'
    },
  ]

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-amber-500 selection:text-white antialiased">
      {/* ── Editorial Hero Section ── */}
      <section className="pt-40 pb-24 px-6 lg:px-12 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-6 flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-[0.2em]">Career Track</span>
            <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">Intensive • Job-Ready</span>
          </div>
          
          <h1 className="text-[12vw] md:text-[8vw] font-black leading-[0.85] tracking-tighter uppercase mb-12">
            Career
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-400">
              Accelerator
            </span>
          </h1>

          <div className="flex flex-col md:flex-row gap-12 md:items-end justify-between border-t-2 border-black pt-12">
            <p className="text-xl md:text-3xl font-medium leading-tight max-w-2xl">
              Turn your technical skills into a hired role. Master the professional practices and intricate habits required to compete in the global market.
            </p>
            <div className="flex-shrink-0">
              <Link
                href="#curriculum"
                className="inline-flex items-center gap-4 bg-black text-white px-8 py-5 font-bold text-sm uppercase tracking-widest hover:bg-amber-600 transition-colors"
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
          <div className="bg-zinc-50 border border-amber-500/20 p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 text-amber-600 font-bold uppercase tracking-widest text-xs">
                <CheckCircle2 size={16} /> Placement Preparation
              </div>
              <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none">
                One-Time Enrolment Fee
              </h3>
              <p className="text-zinc-600 font-medium max-w-xl text-lg">
                Get full access to the Career Accelerator curriculum and entry into the AINA Talent Pool for direct employer matching.
              </p>
              
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  <strong>* Disclaimer:</strong> If you pay for this course, you will be prepared and referred for job placement. However, the entire hiring process is determined by the employer, not AINA. Even though we do our best to ensure you are fit and have a high chance of getting the job, the final decision rests solely with the employer.
                </p>
              </div>
            </div>
            
            <div className="flex-shrink-0 flex flex-col items-center lg:items-end w-full lg:w-auto">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-6xl font-black">$20</span>
              </div>
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-6">One-time payment.</p>
              <div className="w-full lg:w-64">
                <ClickToPayButton
                  courseId="career-accelerator"
                  courseName="Career Accelerator Programme"
                  priceAmount={20}
                  currency="USD"
                />
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-amber-600/70 font-bold uppercase tracking-widest">
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
              Who Should <span className="text-amber-500">Enroll?</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {audienceGroups.map((group, index) => (
              <div key={index} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
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
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 border-t border-amber-500/20 pt-16">
            <div className="lg:col-span-5 space-y-12">
              <div>
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-4">01</span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">Position</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Transform your resume and portfolio from generic lists to compelling narratives that global recruiters actually respond to.
                </p>
              </div>
              <div>
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-4">02</span>
                <h3 className="text-3xl font-bold uppercase tracking-tight mb-4">Perform</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">
                  Master the unspoken rules of behavioral interviews, remote communication, and client negotiation.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-7 bg-amber-950/30 border border-amber-500/20 p-12 flex flex-col justify-end min-h-[400px]">
              <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-4">03</span>
              <h3 className="text-5xl font-black uppercase tracking-tight mb-6">Place</h3>
              <p className="text-zinc-300 text-xl leading-relaxed max-w-md">
                Enter the AINA Talent Pool fully prepared. We connect you with hiring partners, but you close the deal.
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
                  onClick={() => setExpandedModule(expandedModule === mod.num ? null : mod.num)}
                  className="w-full flex items-center justify-between py-8 text-left focus:outline-none"
                >
                  <div className="flex items-center gap-8 md:gap-16">
                    <span className="text-4xl md:text-6xl font-black text-zinc-200 group-hover:text-amber-500 transition-colors">
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
                          <span className="text-amber-500 font-black mt-1">→</span>
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
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />
        
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center relative z-10">
          <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-12">
            Ready to <br/> <span className="text-amber-500">Accelerate?</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-4 bg-amber-500 text-white px-12 py-6 font-bold text-lg uppercase tracking-widest hover:bg-amber-600 transition-colors hover:-translate-y-1 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]"
          >
            Join the Programme <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}
