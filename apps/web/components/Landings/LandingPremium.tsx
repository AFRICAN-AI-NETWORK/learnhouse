'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SiWhatsapp } from '@icons-pack/react-simple-icons'
import { getUriWithOrg } from '@services/config/config'

import HeroSection from './Sections/HeroSection'
import ActiveProgramsSection from './Sections/ActiveProgramsSection'
import HowYouWillLearnSection from './Sections/HowYouWillLearnSection'
import PersonalizedPathSection from './Sections/PersonalizedPathSection'
import LearnerTestimonials from './Sections/LearnerTestimonials'
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

const upcomingSpecializations = [
  {
    id: 'video-production',
    name: 'VIDEO PRODUCTION & EDITING',
    description:
      'Produce and edit high-quality video content for modern media platforms.',
    badgeText: 'Upcoming',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/aina_video_production.jpg',
    status: 'Upcoming' as const,
  },
  {
    id: 'fullstack-dev',
    name: 'FULL STACK DEVELOPMENT',
    description:
      'Master both front-end and back-end modern development practices.',
    badgeText: 'Upcoming',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/aina_fullstack.jpg',
    status: 'Upcoming' as const,
  },
  {
    id: 'mobile-app',
    name: 'MOBILE APP DEVELOPMENT',
    description:
      'Build responsive native and cross-platform mobile applications.',
    badgeText: 'Upcoming',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/aina_mobile_app.jpg',
    status: 'Upcoming' as const,
  },
  {
    id: 'cloud-computing',
    name: 'CLOUD COMPUTING',
    description:
      'Architect and deploy scalable infrastructure on modern cloud providers.',
    badgeText: 'Upcoming',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/aina_cloud_computing.jpg',
    status: 'Upcoming' as const,
  },
  {
    id: 'cyber-security',
    name: 'CYBER SECURITY',
    description:
      'Protect and secure digital ecosystems and sensitive infrastructure.',
    badgeText: 'Upcoming',
    buttonText: 'Join Waitlist ->',
    href: '#',
    imageUrl: '/landing/aina_security.jpg',
    status: 'Upcoming' as const,
  },
  {
    id: 'ui-ux-design',
    name: 'UI/UX DESIGN',
    description:
      'Design beautiful, intuitive, and user-centric digital experiences.',
    badgeText: 'Upcoming',
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
  const realFundamentals = courses?.find((c) =>
    c.name?.toUpperCase().includes('FUNDAMENTALS')
  )

  const activePrograms = [
    {
      id: 'aan-open',
      name: 'GENERATIVE AI',
      description:
        'Your gateway to the AI ecosystem. Access our curated directory of AI foundations and professional tools to kickstart your journey.',
      badgeText: 'Free',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/aan-open'),
      imageUrl: '/landing/aina_genai.jpg',
      status: 'Live' as const,
    },
    {
      id: 'frontend-dev',
      name: 'FRONTEND DEVELOPMENT',
      description:
        'A structured program from complete beginner to job-ready frontend developer. Master HTML, CSS, JavaScript, React, and Tailwind CSS.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/frontend-dev'),
      imageUrl: '/landing/aina_frontend.jpg',
      status: 'Live' as const,
      originalPrice: '$15/mo',
    },
    {
      id: 'ai-engineering',
      name: 'AI ENGINEERING',
      description:
        'A comprehensive journey into advanced AI engineering. Learn to build, fine-tune, and deploy large language models and intelligent systems.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-engineering'),
      imageUrl: '/landing/aina_ai_engineering.jpg',
      status: 'Live' as const,
      originalPrice: '$40/mo',
    },
    {
      id: 'ai-automation-businesses',
      name: 'AI AUTOMATION FOR BUSINESSES',
      description:
        'Learn to leverage modern AI tools to automate complex workflows.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-automation'),
      imageUrl: '/landing/aina_ai_automation.jpg',
      status: 'Live' as const,
      originalPrice: '$37/mo',
    },
    {
      id: 'aan-fundamentals',
      name: 'APPLIED DATA SCIENCE',
      description:
        'Prepare for advanced AI roles by mastering ML algorithms, data structures, and the logic of predictive modeling.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-fundamentals'),
      imageUrl: '/landing/aina_data_science.jpg',
      status: 'Live' as const,
      originalPrice: '$30/mo',
    },
    {
      id: 'nodejs-backend',
      name: 'BACKEND DEVELOPMENT (NODE.JS)',
      description:
        'Master scalable server-side development in this track. Build robust RESTful APIs, manage databases, and deploy production-ready Node.js.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/nodejs-backend'),
      imageUrl: '/landing/aina_backend_node.jpg',
      status: 'Live' as const,
      originalPrice: '$30/mo',
    },
    {
      id: 'ai-automation-content-creators',
      name: 'AI AUTOMATION FOR CONTENT CREATORS',
      description:
        'Master AI tools to supercharge your content creation workflow. Automate research and drafting.',
      badgeText: 'Premium',
      buttonText: 'Learn more ->',
      href: getUriWithOrg(orgslug, '/ai-automation-content-creators'),
      imageUrl: '/landing/aina_content_creators.jpg',
      status: 'Live' as const,
      originalPrice: '$37/mo',
    },
    ...upcomingSpecializations,
  ]

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
      className="min-h-screen bg-white text-[#111827] selection:bg-[#fde8d7]/40"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml} />
      <HeroSection org={org} orgslug={orgslug} />

      {/* 2. Core Offerings */}
      <ActiveProgramsSection programs={activePrograms} orgslug={orgslug} />

      {/* 3. Massive Value-Add/Incentive */}
      <ImpactProgramsSection />

      {/* 4. Methodology */}
      <HowYouWillLearnSection />

      {/* 5. Career Journey */}
      <PersonalizedPathSection orgslug={orgslug} />

      {/* 7. Learner Testimonials */}
      <LearnerTestimonials />

      {/* 8. Secondary Offerings */}
      <ReferAndEarnSection />

      {/* 9. Objection Handling */}
      <FAQSection />

      {/* Awesome Final CTA with beautiful brand gradient */}
      <section
        id="contact"
        className="relative py-32 px-6 overflow-hidden bg-white"
      >
        <div className="relative max-w-[1280px] mx-auto bg-[#111827] border border-gray-800 rounded-[48px] p-16 md:p-24 lg:p-32 text-center overflow-hidden shadow-2xl">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Central Glowing Orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0057ff] rounded-full blur-[150px] opacity-30 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 text-[#60a5fa] text-[13px] font-bold tracking-widest uppercase border border-white/10 backdrop-blur-sm">
              Take the next step
            </span>

            <h2 className="text-4xl md:text-5xl lg:text-[72px] font-bold text-white tracking-tight leading-[1.05]">
              Limited spots <br />
              available.
            </h2>

            <p className="text-[18px] text-gray-400 max-w-2xl mx-auto leading-[1.7]">
              Join 5,400+ Africans who chose to invest in real skills, real
              projects, and real outcomes not just certificates.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 w-full sm:w-auto">
              <Link
                href="/#programs"
                className="w-full sm:w-auto px-10 py-5 bg-[#0057ff] text-white rounded-xl font-bold text-[16px] hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
              >
                Browse All Courses <ArrowRight size={18} />
              </Link>

              <Link
                href="https://wa.me/2349073166932"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white border border-white/10 rounded-xl font-bold text-[16px] hover:bg-white/10 transition-colors flex items-center justify-center backdrop-blur-sm"
              >
                Talk to an Advisor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <GlobalFooter />

      <Link
        href="https://wa.me/2349073166932"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] transition-all duration-300 hover:scale-110 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(37,211,102,0.6)]"
        aria-label="Chat with support on WhatsApp"
      >
        {/* Standard WhatsApp Brand Icon */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png"
          alt="WhatsApp"
          className="w-full h-full object-contain"
        />
      </Link>
    </div>
  )
}
