'use client'

import React from 'react'
import Link from 'next/link'
import { Quote, ArrowRight } from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'

import HeroSection from './Sections/HeroSection'
import PartnersSection from './Sections/PartnersSection'
import ActiveProgramsSection from './Sections/ActiveProgramsSection'
import TechSpecializationsSection from './Sections/TechSpecializationsSection'
import HowYouWillLearnSection from './Sections/HowYouWillLearnSection'
import PersonalizedPathSection from './Sections/PersonalizedPathSection'
import FAQSection from './Sections/FAQSection'
import ReferAndEarnSection from './Sections/ReferAndEarnSection'
import ImpactProgramsSection from './Sections/ImpactProgramsSection'
import GlobalFooter from './GlobalFooter'

interface LandingPremiumProps {
  org: any
  courses: any[]
  collections: any[]
  orgslug: string
}

const techSpecializations = [
  {
    name: 'Full Stack Development',
    description:
      'Master both front-end and back-end modern development practices.',
    image: '',
  },
  {
    name: 'Mobile App Development',
    description:
      'Build responsive native and cross-platform mobile applications.',
    image: '',
  },
  {
    name: 'Cloud Computing',
    description:
      'Architect and deploy scalable infrastructure on modern cloud providers.',
    image: '',
  },
  {
    name: 'Cyber Security',
    description:
      'Protect and secure digital ecosystems and sensitive infrastructure.',
    image: '',
  },
  {
    name: 'UI/UX Design',
    description:
      'Design beautiful, intuitive, and user-centric digital experiences.',
    image: '',
  },
  {
    name: 'Graphic Design',
    description:
      'Create stunning visual concepts that inspire, inform, and captivate consumers.',
    image: '',
  },
  {
    name: 'Video Production & Editing',
    description:
      'Produce and edit high-quality video content for modern media platforms.',
    image: '',
  },
  {
    name: 'Digital Marketing',
    description:
      'Drive growth through strategic online marketing, SEO, and social media campaigns.',
    image: '',
  },
  {
    name: 'Product Management',
    description:
      'Lead cross-functional teams to build products that deliver immense value.',
    image: '',
  },
  {
    name: 'Project Management',
    description:
      'Master agile methodologies to deliver complex projects on time and within scope.',
    image: '',
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
      badgeText: '',
      badgeColor: 'bg-amber-500', // orange tab
      buttonColor: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/aan-open'),
      imageUrl: '/landing/program_genai_v2.png',
    },
    {
      id: 'ai-automation',
      name: 'AI Automation',
      description:
        'Learn to leverage modern AI tools to automate complex workflows. Includes internship opportunities and laptop giveaways for eligible students.',
      badgeText: '',
      badgeColor: 'bg-purple-600', // purple tab
      buttonColor: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-automation'),
      imageUrl: '/landing/program_automation_v3.png',
    },
    {
      id: 'aan-fundamentals',
      name: 'AAN Fundamentals (Machine Learning)',
      description:
        realFundamentals?.description ||
        'Prepare for advanced AI roles by mastering ML algorithms, data structures, and the logic of predictive modeling.',
      badgeText: '',
      badgeColor: 'bg-emerald-500', // green tab
      buttonColor: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-fundamentals'),
      imageUrl: '/landing/program_ml_v2.png',
    },
  ]

  return (
    <div
      className="min-h-screen bg-white text-[#0a0f1e] selection:bg-[#0057ff]/20"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <HeroSection org={org} orgslug={orgslug} />

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

      {/* 6. Specific Skills */}
      <TechSpecializationsSection
        specializations={techSpecializations}
        orgslug={orgslug}
        bgColor="bg-white"
      />

      {/* 7. Social Proof & Impact (Testimonials) */}
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
                            <img
                              src={t.image_url}
                              alt={t.author}
                              className="w-12 h-12 rounded-full object-cover"
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

      {/* 8. Secondary Offerings */}
      <ReferAndEarnSection />

      {/* 9. Objection Handling */}
      <FAQSection />

      {/* Awesome Final CTA */}
      <section className="relative py-24 px-6 overflow-hidden bg-white">
        <div className="relative max-w-6xl mx-auto bg-[#0a0f1e] rounded-[32px] p-12 md:p-20 text-center overflow-hidden">
          {/* Subtle glowing corners */}
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#0057ff] rounded-full blur-[120px] opacity-20 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Ready to start?
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
              Your tech career starts today.
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
    </div>
  )
}
