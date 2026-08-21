'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import NextImage from 'next/image'

interface PersonalizedPathSectionProps {
  orgslug: string
}

export default function PersonalizedPathSection({
  orgslug,
}: PersonalizedPathSectionProps) {
  return (
    <section className="relative py-24 px-6 lg:px-12 bg-[#f8f9fc] overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16 lg:gap-24">
        {/* Left Side: Image & Decor */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex-1 w-full relative"
        >
          {/* Dot Pattern Decor */}
          <div className="absolute -top-10 -right-10 w-48 h-64 z-0">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="dotPattern"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    fill="#0057ff"
                    cx="2"
                    cy="2"
                    r="2"
                    opacity="0.3"
                  ></circle>
                </pattern>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#dotPattern)"
              ></rect>
            </svg>
          </div>
          <div className="absolute -bottom-10 -right-24 w-32 h-64 z-0">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern
                  id="dotPattern2"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle
                    fill="#8b5cf6"
                    cx="2"
                    cy="2"
                    r="2"
                    opacity="0.2"
                  ></circle>
                </pattern>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#dotPattern2)"
              ></rect>
            </svg>
          </div>

          {/* Main Image Wrapper */}
          <div className="relative z-10 aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
            <NextImage
              src="/landing/student_studying_library.png"
              alt="Personalized Learning Platform"
              className="w-full h-full object-cover"
              width={800}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0057ff]/10 to-transparent mix-blend-overlay" />
          </div>
        </motion.div>

        {/* Right Side: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex-1 space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#0057ff] text-xs font-bold tracking-wide border border-[#0057ff]/20 shadow-sm">
            AI-Embedded Learning Platform
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#0a0f1e] tracking-tight leading-[1.1] uppercase">
            Your learning path, <br />
            <span className="text-[#0057ff]">personalised by AI.</span>
          </h2>

          <p className="text-lg text-gray-500 max-w-xl leading-relaxed">
            Track your progress, stay consistent, and access personalised
            learning support through our modern student platform designed to
            help you succeed faster.
          </p>

          <div className="pt-2">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 text-[#0057ff] font-bold hover:text-[#0046cc] transition-colors group"
            >
              Apply now{' '}
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
