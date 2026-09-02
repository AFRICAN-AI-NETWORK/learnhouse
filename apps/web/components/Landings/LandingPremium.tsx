'use client'

import React from 'react'
import Link from 'next/link'
import { Quote, ArrowRight } from 'lucide-react'
import { SiWhatsapp } from '@icons-pack/react-simple-icons'
import { getUriWithOrg } from '@services/config/config'

import HeroSection from './Sections/HeroSection'
import PartnersSection from './Sections/PartnersSection'
import ActiveProgramsSection from './Sections/ActiveProgramsSection'

import HowYouWillLearnSection from './Sections/HowYouWillLearnSection'
import PersonalizedPathSection from './Sections/PersonalizedPathSection'
import LearnerTestimonials from './Sections/LearnerTestimonials'
import FAQSection from './Sections/FAQSection'
import ReferAndEarnSection from './Sections/ReferAndEarnSection'
import ImpactProgramsSection from './Sections/ImpactProgramsSection'
import MobileAppLaunchSection from './Sections/MobileAppLaunchSection'
import GlobalFooter from './GlobalFooter'
import NextImage from 'next/image'

interface LandingPremiumProps {
  org: any
  courses: any[]
  collections: any[]
  orgslug: string
}

const upcomingSpecializations = [
  {
    id: 'video-production',
    name: 'VIDEO PRODUCTION & EDITING',
    description:
      'Produce and edit high-quality video content for modern media platforms.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-red-500',
    buttonColor: 'bg-red-50 text-red-600 hover:bg-red-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_video_animation.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'fullstack-dev',
    name: 'FULL STACK DEVELOPMENT',
    description:
      'Master both front-end and back-end modern development practices.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-slate-700',
    buttonColor: 'bg-slate-50 text-slate-700 hover:bg-slate-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_fullstack.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'mobile-app',
    name: 'MOBILE APP DEVELOPMENT',
    description:
      'Build responsive native and cross-platform mobile applications.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-sky-500',
    buttonColor: 'bg-sky-50 text-sky-600 hover:bg-sky-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_mobile.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'cloud-computing',
    name: 'CLOUD COMPUTING',
    description:
      'Architect and deploy scalable infrastructure on modern cloud providers.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-orange-500',
    buttonColor: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_cloud.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'cyber-security',
    name: 'CYBER SECURITY',
    description:
      'Protect and secure digital ecosystems and sensitive infrastructure.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-zinc-800',
    buttonColor: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_security.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX DESIGN',
    description:
      'Design beautiful, intuitive, and user-centric digital experiences.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-fuchsia-500',
    buttonColor: 'bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_uiux.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'graphic-design',
    name: 'GRAPHIC DESIGN',
    description:
      'Create stunning visual concepts that inspire, inform, and captivate consumers.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-pink-500',
    buttonColor: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_graphic.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'digital-marketing',
    name: 'DIGITAL MARKETING',
    description:
      'Drive growth through strategic online marketing, SEO, and social media campaigns.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-blue-400',
    buttonColor: 'bg-blue-50 text-blue-500 hover:bg-blue-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_marketing.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'product-management',
    name: 'PRODUCT MANAGEMENT',
    description:
      'Lead cross-functional teams to build products that deliver immense value.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-yellow-500',
    buttonColor: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_product_mgmt.png',
    status: 'Upcoming' as const,
  },
  {
    id: 'project-management',
    name: 'PROJECT MANAGEMENT',
    description:
      'Master agile methodologies to deliver complex projects on time and within scope.',
    badgeText: 'Upcoming',
    badgeColor: 'bg-lime-600',
    buttonColor: 'bg-lime-50 text-lime-700 hover:bg-lime-100',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/program_project_mgmt.png',
    status: 'Upcoming' as const,
  },
]

export default function LandingPremium({
  org,
  courses,
  collections,
  orgslug,
}: LandingPremiumProps) {
  // Find AAN Fundamentals description if it exists
  const realFundamentals = courses?.find((c) =>
    c.name?.toUpperCase().includes('FUNDAMENTALS')
  )

  // Format Active Programs Array
  const activePrograms = [
    {
      id: 'aan-open',
      name: 'AAN OPEN (Generative AI)',
      description:
        'Your gateway to the AI ecosystem. Access our curated directory of AI foundations and professional tools to kickstart your journey.',
      badgeText: 'Free',
      badgeColor: 'bg-amber-500', // orange tab
      buttonColor: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/aan-open'),
      imageUrl: '/landing/program_genai_v2.png',
      status: 'Live' as const,
    },
    {
      id: 'ai-automation-businesses',
      name: 'AI AUTOMATION FOR BUSINESSES',
      description:
        'Learn to leverage modern AI tools to automate complex workflows. Pricing is a $60 one-time fee for the 12 weeks, or $20 per month. Includes internship opportunities and laptop giveaways for eligible students.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-purple-600', // purple tab
      buttonColor: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-automation'),
      imageUrl: '/landing/program_automation_v3.png',
      status: 'Live' as const,
    },
    {
      id: 'ai-automation-content-creators',
      name: 'AI AUTOMATION FOR CONTENT CREATORS',
      description:
        'Master AI tools to supercharge your content creation workflow. Pricing is a $60 one-time fee for the 12 weeks, or $20 per month. Automate research, drafting, and distribution to scale your personal brand.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-pink-600', // pink tab
      buttonColor: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-automation-content-creators'),
      imageUrl: '/landing/program_content_creators.png',
      status: 'Live' as const,
    },
    {
      id: 'aan-fundamentals',
      name: 'AAN Fundamentals (Applied Data Science)',
      description:
        realFundamentals?.description ||
        'Prepare for advanced AI roles by mastering ML algorithms, data structures, and the logic of predictive modeling. Pricing is a $90 one-time fee for the 12 weeks, or $30 per month.',
      badgeText: 'Paid ($30/mo)',
      badgeColor: 'bg-emerald-500', // green tab
      buttonColor: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-fundamentals'),
      imageUrl: '/landing/program_ml_v2.png',
      status: 'Live' as const,
    },
    {
      id: 'ai-engineering',
      name: 'AI ENGINEERING',
      description:
        'A comprehensive 6-month journey into advanced AI engineering. Learn to build, fine-tune, and deploy large language models and intelligent systems.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-blue-600',
      buttonColor: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-engineering'),
      imageUrl: '/landing/program_ai_engineering.png',
      status: 'Live' as const,
    },
    {
      id: 'frontend-dev',
      name: 'FRONTEND DEVELOPMENT',
      description:
        'A structured 3-month program from complete beginner to job-ready frontend developer. Master HTML, CSS, JavaScript, React, and Tailwind CSS.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-teal-600',
      buttonColor: 'bg-teal-50 text-teal-600 hover:bg-teal-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/frontend-dev'),
      imageUrl: '/landing/program_frontend.png',
      status: 'Live' as const,
    },
    {
      id: 'nodejs-backend',
      name: 'BACKEND DEVELOPMENT (NODE.JS)',
      description:
        'Master scalable server-side development in this 3-month track. Build robust RESTful APIs, manage databases, and deploy production-ready Node.js applications.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-indigo-600',
      buttonColor: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/nodejs-backend'),
      imageUrl: '/landing/program_backend_node.png',
      status: 'Live' as const,
    },
    {
      id: 'laravel-backend',
      name: 'BACKEND DEVELOPMENT (LARAVEL)',
      description:
        'Become a highly sought-after PHP developer in 3 months. Learn Laravel, relational database design, authentication, and API development.',
      badgeText: 'Paid ($20/mo)',
      badgeColor: 'bg-rose-600',
      buttonColor: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/laravel-backend'),
      imageUrl: '/landing/program_backend_laravel.png',
      status: 'Live' as const,
    },
    ...upcomingSpecializations,
  ]

  // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
  const jsonLdHtml = {
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: 'African AI Network Academy (AINA)',
      alternateName: 'AINA',
      url: `https://lms.africanainetwork.com/orgs/${orgslug}`,
      description:
        org?.description ||
        'African AI Network Academy (AINA) is a learning management system offering 12-week certification courses in AI Automation and Generative AI for African professionals.',
      sameAs: [
        'https://web.facebook.com/africanaistudies/',
        'https://www.youtube.com/@AfricanAINetwork',
      ],
      offers: {
        '@type': 'Offer',
        category: 'Educational Courses',
      },
    }).replace(/</g, '\\u003c'),
  }

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-[#0057ff]/20"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml} />
      <HeroSection org={org} orgslug={orgslug} />

      {/* Fact Density for AI Extractability */}
      <section className="bg-white py-12 px-6 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[#555555] text-lg md:text-xl font-medium leading-relaxed">
            <strong className="text-[#0a0f1e]">
              African AI Network Academy (AINA)
            </strong>{' '}
            is an online tech platform providing 12-week certification courses
            in Generative AI, AI Automation, and Data Science for African
            professionals.
          </p>
        </div>
      </section>

      {/* 1. Trust & Social Proof */}
      <PartnersSection />

      {/* 2. Core Offerings */}
      <ActiveProgramsSection programs={activePrograms} orgslug={orgslug} />

      {/* 3. Massive Value-Add/Incentive (Moved up from bottom) */}
      <ImpactProgramsSection />

      {/* 4. Methodology */}
      <HowYouWillLearnSection />

      {/* 5. Career Journey */}
      <PersonalizedPathSection orgslug={orgslug} />

      {/* 7. Learner Testimonials */}
      <LearnerTestimonials />

      {/* 8. Social Proof & Impact (Testimonials) */}
      {org?.config?.config?.landing?.sections?.map(
        (section: any, index: number) => {
          if (section.type === 'testimonials') {
            return (
              <section
                key={index}
                className="py-24 px-6 bg-white border-y border-gray-100"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-[#0a0f1e] mb-4">
                      {section.title || 'What Our Students Say'}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {section.testimonials?.map((t: any, i: number) => (
                      <div
                        key={i}
                        className="p-8 rounded-[28px] bg-[#f9fafb] border border-gray-100 relative"
                      >
                        <Quote
                          className="text-[#0057ff]/10 absolute top-6 right-8"
                          size={40}
                        />
                        <p className="text-[#555555] italic mb-6 relative z-10 text-[15px]">
                          "{t.text}"
                        </p>
                        <div className="flex items-center gap-4">
                          {t.image_url && (
                            <NextImage
                              src={t.image_url}
                              alt={t.author}
                              className="w-12 h-12 rounded-full object-cover"
                              width={800}
                              height={800}
                            />
                          )}
                          <div>
                            <p className="font-bold text-[#0a0f1e] text-[14px]">
                              {t.author}
                            </p>
                            <p className="text-[12px] text-[#555555]">
                              {t.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (section.type === 'impact-metrics') {
            return (
              <section
                key={index}
                className="py-24 px-6 bg-[#f9fafb] border-t border-gray-100"
              >
                <div className="max-w-7xl mx-auto">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {section.metrics?.map((m: any, i: number) => (
                      <div key={i} className="text-center space-y-2">
                        <p className="text-5xl font-black text-[#0057ff]">
                          {m.value}
                          {m.suffix}
                        </p>
                        <p className="text-[12px] font-bold uppercase tracking-wider text-[#555555]">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )
          }

          if (section.type === 'cta') {
            return null // We are using a custom final CTA instead
          }

          return null
        }
      )}

      {/* 7.5 Mobile App Launch (Phase 5) */}
      <MobileAppLaunchSection />

      {/* 8. Secondary Offerings */}
      <ReferAndEarnSection />

      {/* 9. Objection Handling */}
      <FAQSection />

      {/* Awesome Final CTA */}
      <section
        id="contact"
        className="relative py-24 px-6 overflow-hidden bg-white"
      >
        <div className="relative max-w-6xl mx-auto bg-[#0a0f1e] rounded-[32px] p-12 md:p-20 text-center overflow-hidden">
          {/* Subtle glowing corners */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#0057ff] rounded-full blur-[120px] opacity-20 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Ready to start?
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight uppercase">
              YOUR TECH CAREER STARTS TODAY.
            </h2>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed pb-4">
              Join 5,400+ Africans who chose to invest in real skills, real
              projects, and real outcomes not just certificates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/#programs"
                className="w-full sm:w-auto px-8 py-4 bg-white text-[#0057ff] rounded-xl font-bold text-[15px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                Browse All Courses <ArrowRight size={18} />
              </Link>

              <Link
                href="https://wa.me/2349073166932"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border border-white/20 rounded-xl font-bold text-[15px] hover:bg-white/5 transition-colors flex items-center justify-center"
              >
                Talk to an Advisor
              </Link>
            </div>

            <div className="pt-8">
              <p className="text-sm text-gray-500 font-medium">
                Next cohort starts{' '}
                <span className="text-gray-300">in 2 weeks</span> &middot;
                Limited spots available
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <GlobalFooter />

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-gray-100 p-2 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
          Need help?
        </span>
        <Link
          href="https://wa.me/2349073166932"
          target="_blank"
          rel="noopener noreferrer"
          className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 ring-2 ring-white/60 transition-transform duration-300 hover:-translate-y-1 hover:bg-[#1ebe57] motion-safe:animate-bounce"
          aria-label="Chat with support on WhatsApp"
        >
          <SiWhatsapp size={26} />
        </Link>
      </div>
    </div>
  )
}
