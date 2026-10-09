'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import NextImage from 'next/image'

interface PersonalizedPathSectionProps {
  orgslug: string
}

export default function PersonalizedPathSection({
  orgslug,
}: PersonalizedPathSectionProps) {
  return (
    <section className="relative py-32 px-6 lg:px-12 bg-[#f8fafc] overflow-hidden border-t border-gray-100">
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-16 lg:gap-24">
        {/* Left Side: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex-1 space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f5ff] text-[#0057ff] text-[13px] font-bold tracking-wide">
            <Sparkles size={14} className="text-[#0057ff]" /> AI-Embedded
            Platform
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-[#111827] tracking-tight leading-[1.1]">
            Your learning path, <br />
            personalised by AI.
          </h2>

          <p className="text-[17px] text-[#555555] max-w-xl leading-[1.7]">
            Track your progress, stay consistent, and access personalised
            learning support through our modern student platform designed to
            help you succeed faster. Our AI mentors are available 24/7 to
            unstuck you.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#111827] text-white font-bold rounded-xl text-[15px] hover:bg-black transition-colors"
            >
              Start for free
            </Link>
            <Link
              href="/#programs"
              className="inline-flex items-center gap-2 px-8 py-4 text-[#111827] font-bold text-[15px] hover:opacity-80 transition-opacity group"
            >
              View Programs{' '}
              <ArrowRight
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </motion.div>

        {/* Right Side: Image */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1 w-full relative flex justify-end"
        >
          {/* Main Image Wrapper */}
          <div className="relative z-10 w-full max-w-[500px] aspect-square lg:aspect-[4/5] rounded-[48px] overflow-hidden shadow-2xl border-[8px] border-white">
            <NextImage
              src="/landing/student_studying_library.png"
              alt="Personalized Learning Platform"
              className="w-full h-full object-cover"
              width={800}
              height={800}
            />
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-20 -right-10 z-0 hidden lg:block">
            <div className="w-32 h-32 rounded-full bg-[#0057ff] opacity-10 blur-3xl" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
