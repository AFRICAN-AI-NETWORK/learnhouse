'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, ArrowRight, Cpu, CheckCircle2, Users } from 'lucide-react'

interface HeroSectionProps {
  org: any
  orgslug: string
}

export default function HeroSection({ org, orgslug }: HeroSectionProps) {
  return (
    <section className="relative pt-24 pb-24 lg:pb-0 px-6 lg:px-12 overflow-hidden bg-white min-h-[90vh] flex items-center">
      {/* Background Fluid Shapes (Jobspot/Modern SaaS Style) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] bg-pink-400/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-stretch z-10 w-full min-h-[600px]">
        {/* Left Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center space-y-8 z-10 py-12 lg:py-24"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest border border-blue-100">
              <Sparkles size={14} /> The Future of Learning
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] uppercase text-[#0a0f1e]">
            Accelerate Your Career In The{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-purple-600">
              New Economy
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-500 max-w-xl font-medium leading-relaxed">
            Master artificial intelligence, software engineering, and the most
            in-demand tech skills with {org?.name || 'African AI Network'}.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              href="/#programs"
              className="w-full sm:w-auto px-8 py-4 bg-[#0057ff] text-white rounded-[12px] font-bold text-[14px] flex items-center justify-center gap-3 hover:bg-[#0046cc] hover:shadow-lg transition-all duration-200"
            >
              Browse Programs
              <ArrowRight
                size={18}
                className="translate-x-0 group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#0a0f1e] border border-gray-200 rounded-[12px] font-bold text-[14px] flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              Join the Community
            </Link>
          </div>
        </motion.div>

        {/* Right Content Area: Hero Image & Floating Elements */}
        <div className="relative hidden lg:flex items-end justify-center pt-20">
          {/* Wrapper to keep image, blobs and floating cards together */}
          <div className="relative w-full max-w-[650px] h-[650px] lg:h-[750px] flex items-end justify-center">
            {/* Abstract SVG Blobs (Jobspot Style) */}
            <div className="absolute inset-0 flex items-center justify-center z-0">
              <svg
                viewBox="0 0 500 500"
                className="w-[180%] h-[180%] -translate-y-12"
              >
                {/* Yellow Blob */}
                <path
                  fill="#facc15"
                  d="M394.5,310.5Q343,371,273.5,389.5Q204,408,131.5,372Q59,336,65,257.5Q71,179,139,134.5Q207,90,283.5,91.5Q360,93,403,171.5Q446,250,394.5,310.5Z"
                  className="origin-center scale-90 translate-x-20 translate-y-24"
                />
                {/* Purple Blob */}
                <path
                  fill="#7e22ce"
                  d="M428.5,301.5Q404,353,354,383Q304,413,248.5,417.5Q193,422,143,391.5Q93,361,84.5,305.5Q76,250,103,199Q130,148,181,114.5Q232,81,288.5,91Q345,101,399,140Q453,179,428.5,301.5Z"
                  className="origin-center scale-75 translate-x-12 -translate-y-20"
                />
                {/* Cyan Blob */}
                <path
                  fill="#06b6d4"
                  d="M380.5,315.5Q347,381,274,394.5Q201,408,131.5,364.5Q62,321,81.5,244.5Q101,168,172,130.5Q243,93,313,116.5Q383,140,403.5,195Q424,250,380.5,315.5Z"
                  className="origin-center scale-[0.8] -translate-x-16"
                />

                {/* Thin white ring rotated */}
                <circle
                  cx="230"
                  cy="250"
                  r="160"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  className="opacity-80"
                />
              </svg>
            </div>

            {/* Main Hero Cutout Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 w-full flex items-end justify-center origin-bottom"
            >
              <img
                src="/landing/hero_person.png"
                alt="Tech Professional"
                className="relative z-10 w-auto h-auto min-h-[600px] lg:min-h-[700px] max-h-[85vh] object-cover object-bottom scale-[1.05]"
              />
            </motion.div>

            {/* Floating UI Card 1: 5000+ Learners */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: 20 }}
              animate={{ opacity: 1, y: [0, -10, 0], x: 0 }}
              transition={{
                opacity: { duration: 0.6, delay: 0.3 },
                y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute top-24 right-[-2rem] lg:right-[-4rem] z-20 bg-white/80 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl shadow-xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[#0a0f1e] font-black text-lg">5,000+</p>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  Learners Enrolled
                </p>
              </div>
            </motion.div>

            {/* Floating UI Card 2: AI Automation */}
            <motion.div
              initial={{ opacity: 0, y: 20, x: -20 }}
              animate={{ opacity: 1, y: [0, 10, 0], x: 0 }}
              transition={{
                opacity: { duration: 0.6, delay: 0.5 },
                y: {
                  duration: 5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 1,
                },
              }}
              className="absolute bottom-32 left-[-2rem] lg:left-[-4rem] z-20 bg-white/80 backdrop-blur-xl border border-gray-100 p-4 rounded-2xl shadow-xl flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                <Cpu size={24} />
              </div>
              <div>
                <p className="text-[#0a0f1e] font-black text-lg">
                  AI Automation
                </p>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  Top Specialization
                </p>
              </div>
            </motion.div>

            {/* Floating UI Card 3: Success Checkmark */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [1, 1.1, 1] }}
              transition={{
                opacity: { duration: 0.4, delay: 0.8 },
                scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="absolute top-1/2 left-20 z-0 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30"
            >
              <CheckCircle2 size={20} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
