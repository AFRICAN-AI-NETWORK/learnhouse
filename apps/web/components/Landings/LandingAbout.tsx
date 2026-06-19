'use client'

import React from 'react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import {
  Target,
  Sparkles,
  Globe,
  MessageSquare,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function LandingAbout() {
  const org = useOrg() as any
  const orgSlug = org?.slug || 'aan'

  const team = [
    {
      name: 'Mr Williams',
      role: 'Program Director',
      initials: 'MW',
      color: 'bg-[#0057ff]',
    },
    {
      name: 'Mr Fasakin',
      role: 'Lead Instructor',
      initials: 'MF',
      color: 'bg-purple-600',
    },

    // Instructors
    {
      name: 'Mr Monday Ohe-obe',
      role: 'Instructor',
      initials: 'MO',
      color: 'bg-emerald-600',
    },
    {
      name: 'Mr Samuel Hassan',
      role: 'Instructor',
      initials: 'SH',
      color: 'bg-amber-500',
    },
    {
      name: 'Mr Emmanuel Ejike',
      role: 'Instructor',
      initials: 'EE',
      color: 'bg-pink-600',
    },
    {
      name: 'Mr Onyeipke Kingsley',
      role: 'Instructor',
      initials: 'OK',
      color: 'bg-cyan-600',
    },
    {
      name: 'Mr Elysee',
      role: 'Instructor',
      initials: 'ME',
      color: 'bg-indigo-600',
    },

    // Teaching Assistants
    {
      name: 'Miss Maureen',
      role: 'Teaching Assistant',
      initials: 'MM',
      color: 'bg-rose-500',
    },
    {
      name: 'Mr Cirvirter Barnabas',
      role: 'Teaching Assistant',
      initials: 'CB',
      color: 'bg-teal-600',
    },
    {
      name: 'Mr Abdullahi Ibrahim',
      role: 'Teaching Assistant',
      initials: 'AI',
      color: 'bg-blue-500',
    },
    {
      name: 'Mr James Usman',
      role: 'Teaching Assistant',
      initials: 'JU',
      color: 'bg-fuchsia-600',
    },
    {
      name: 'Mr Zakariya',
      role: 'Teaching Assistant',
      initials: 'MZ',
      color: 'bg-orange-500',
    },
  ]

  const values = [
    {
      icon: <Target className="text-[#0057ff]" size={24} />,
      title: 'Outcomes over certificates',
      desc: 'We measure success by internship placements and client revenue — not just enrolment numbers. The Laptop Giveaway and structured Internship pathways prove we are invested in your career.',
      bgColor: 'bg-[#0057ff]/10',
    },
    {
      icon: <Globe className="text-emerald-600" size={24} />,
      title: 'African-first perspective',
      desc: 'Our curriculum is built for African realities. Local pricing, 2G-friendly tooling, and African case studies. We are not translating a foreign curriculum — we built the right one.',
      bgColor: 'bg-emerald-600/10',
    },
    {
      icon: <Zap className="text-amber-500" size={24} />,
      title: 'Mobile-first by design',
      desc: 'Most platforms treat mobile as an afterthought. We inverted the model. Our platform is fully responsive and designed to work on the devices Africans actually use everyday.',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: <ShieldCheck className="text-purple-600" size={24} />,
      title: 'Honesty and Accessibility',
      desc: 'We tell students what a track requires before they enrol. AAN Open is free to start because we believe the entry point to AI literacy should be a launchpad, not a financial barrier.',
      bgColor: 'bg-purple-600/10',
    },
    {
      icon: <MessageSquare className="text-pink-600" size={24} />,
      title: 'Community is infrastructure',
      desc: 'Your cohort becomes your network. With representatives stationed across multiple African countries, our community is genuinely local and grounded wherever our learners are.',
      bgColor: 'bg-pink-600/10',
    },
    {
      icon: <Sparkles className="text-cyan-600" size={24} />,
      title: 'The Missing Bridge',
      desc: "We don't dump beginners straight into complex machine learning. Our 3-stage pathway takes you from basic prompting, to real AI automation, and finally deep technical modeling.",
      bgColor: 'bg-cyan-600/10',
    },
  ]

  return (
    <div
      className="bg-white text-[#0a0f1e]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* 1. Page Hero */}
      <section className="pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0057ff]/5 text-[#0057ff] font-bold text-[13px] uppercase tracking-widest mb-8 border border-[#0057ff]/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0057ff] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0057ff]"></span>
          </span>
          Our Story
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
          Building Africa's{' '}
          <span className="text-[#0057ff]">AI Workforce.</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-10">
          We exist to make Africa a producer of AI solutions, not just a
          consumer. Built from the ground up for African learners.
        </p>
        <Link
          href="#story"
          className="inline-flex items-center justify-center px-8 py-4 bg-[#0a0f1e] text-white rounded-xl font-bold hover:bg-[#0a0f1e]/90 transition-all shadow-lg hover:shadow-xl"
        >
          Read Our Story
        </Link>
      </section>

      {/* 2. Mission Stats Band */}
      <section className="bg-[#0a0f1e] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-white/10">
            <div className="text-center px-4">
              <div className="text-4xl md:text-5xl font-black text-[#0057ff] mb-2">
                30,000+
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Community Members
              </div>
            </div>
            <div className="text-center px-4 border-l border-white/10">
              <div className="text-4xl md:text-5xl font-black text-[#0057ff] mb-2">
                2,300+
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Curated AI Tools
              </div>
            </div>
            <div className="text-center px-4 border-l-0 md:border-l border-white/10">
              <div className="text-4xl md:text-5xl font-black text-[#0057ff] mb-2">
                3
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Learning Stages
              </div>
            </div>
            <div className="text-center px-4 border-l border-white/10">
              <div className="text-4xl md:text-5xl font-black text-[#0057ff] mb-2">
                100%
              </div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Mobile-First
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Our Story / The Missing Bridge */}
      <section id="story" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-12 gap-16 items-start">
          <div className="md:col-span-4 md:sticky top-32">
            <div className="bg-[#f8f9fc] rounded-[32px] p-8 border border-gray-100 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#0057ff] rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#0057ff]/20">
                <Globe className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">African AI Network</h3>
              <p className="text-sm text-gray-500 font-medium">
                Headquartered in Africa
                <br />
                Built for the Continent
              </p>
            </div>
          </div>

          <div className="md:col-span-8 prose prose-lg prose-gray max-w-none">
            <h2 className="text-4xl font-black tracking-tight mb-8 text-[#0a0f1e]">
              Who We Are
            </h2>

            <p className="text-gray-600 leading-relaxed mb-6">
              The African AI Network (AAN) is a community-driven organisation
              dedicated to fostering the growth and development of artificial
              intelligence across Africa. We are a collaborative hub empowering
              African AI actors such as entrepreneurs, content creators,
              business owners, students, and developers to explore, develop, and
              implement AI solutions that solve real African problems.
            </p>

            <p className="text-gray-600 leading-relaxed mb-6">
              Unlike global platforms that treat Africa as an afterthought, AAN
              was built from the ground up <strong>for</strong> African
              learners: African use cases, African languages, African pricing,
              African community, and African career outcomes.
            </p>

            <div className="my-12 p-8 md:p-10 bg-[#0057ff]/5 rounded-3xl border-l-4 border-[#0057ff]">
              <p className="text-2xl md:text-3xl font-black text-[#0a0f1e] leading-tight mb-4">
                "We are not just a course provider. We are a continental
                movement."
              </p>
              <p className="text-gray-500 font-medium">
                — A structured learning pathway, a mobile-first learning
                experience, a referral-powered growth engine, and a
                career-launching internship network.
              </p>
            </div>

            <h3 className="text-2xl font-bold mb-4 text-[#0a0f1e]">
              The Missing Bridge
            </h3>
            <p className="text-gray-600 leading-relaxed mb-6">
              We discovered something important from our own student engagement
              data: most learners coming into AI education are not aspiring
              machine learning engineers on day one. They are professionals who
              want practical, monetisable AI skills first.
            </p>
            <p className="text-gray-600 leading-relaxed">
              So instead of forcing every learner down one rigid technical path,
              we built a <strong>three-stage learning pathway</strong> that
              meets people exactly where they are and grows with them, turning
              AI-curious beginners into confident users, then into automation
              professionals, and finally into technical ML practitioners.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Values Section */}
      <section className="bg-[#f8f9fc] py-24 px-6 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#0057ff] mb-4">
              What We Stand For
            </h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-[#0a0f1e] max-w-2xl">
              Principles we refuse to compromise on.
            </h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {values.map((v, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${v.bgColor} flex items-center justify-center mb-6`}
                >
                  {v.icon}
                </div>
                <h4 className="text-xl font-bold mb-3">{v.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Team Section */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#0057ff] mb-4">
            The Team
          </h2>
          <h3 className="text-4xl md:text-5xl font-black tracking-tight text-[#0a0f1e]">
            Our Expert Team
          </h3>
          <p className="text-lg text-gray-500 mt-6 max-w-2xl mx-auto">
            A dedicated group of educators, technical experts, and community
            leaders driving the African AI Network forward.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {team.map((member, i) => (
            <div
              key={i}
              className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300"
            >
              <div
                className={`w-20 h-20 rounded-full ${member.color} flex items-center justify-center text-white text-2xl font-black tracking-tighter mb-5 shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform duration-300`}
              >
                {member.initials}
              </div>
              <h4 className="font-bold text-[#0a0f1e] mb-1">{member.name}</h4>
              <p className="text-xs font-bold uppercase tracking-wider text-[#0057ff] bg-[#0057ff]/10 px-3 py-1 rounded-full mt-2">
                {member.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="relative py-24 px-6 overflow-hidden bg-white">
        <div className="relative max-w-6xl mx-auto bg-[#0a0f1e] rounded-[32px] p-12 md:p-20 text-center overflow-hidden">
          {/* Subtle glowing corners */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#0057ff] rounded-full blur-[120px] opacity-20 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Join the Movement
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
              Be part of what we're building.
            </h2>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed pb-4">
              Whether you're here to learn, teach, or partner there's a place
              for you at the African AI Network.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href={getUriWithOrg(orgSlug, '/aan-open')}
                className="w-full sm:w-auto px-8 py-4 bg-[#0057ff] text-white rounded-xl font-bold text-[15px] hover:bg-[#0046cc] transition-colors shadow-lg shadow-[#0057ff]/20"
              >
                Explore Programs
              </Link>
              <Link
                href="https://wa.me/2349073166932"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-white/20 rounded-xl font-bold text-[15px] hover:bg-white/10 transition-colors"
              >
                Talk to an Advisor
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
