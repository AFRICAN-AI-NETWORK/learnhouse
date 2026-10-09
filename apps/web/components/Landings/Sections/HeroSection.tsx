'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NextImage from 'next/image'

interface HeroSectionProps {
  org: any
  orgslug: string
}

export default function HeroSection({ org, orgslug }: HeroSectionProps) {
  return (
    <div className="bg-[#f8fafc] w-full relative overflow-hidden font-sans">
      {/* Background Shape - Top Right */}
      <div
        className="absolute top-0 right-0 w-[30vw] h-[65%] bg-[#e6f0fa] rounded-bl-[80px] z-0 hidden lg:block"
        aria-hidden="true"
      />

      <section className="relative z-10 max-w-[1450px] mx-auto px-6 lg:px-12 pt-24 pb-20 lg:pt-32 lg:pb-32">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
          {/* Left Column: Content (approx 48%) */}
          <div className="w-full lg:w-[48%] flex flex-col items-start space-y-7">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-[18px] py-[10px] bg-[#f0f5ff] rounded-full text-[#0057ff] text-[14px] font-bold"
            >
              <span className="text-xs opacity-60">*</span>
              Get started with AINA
              <span className="text-xs opacity-60">*</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[42px] md:text-[50px] lg:text-[68px] xl:text-[76px] font-bold text-[#111111] leading-[1.05] tracking-[-2px] max-w-[650px]"
            >
              Find suitable courses from the Best{' '}
              <span className="inline-flex items-center align-middle mx-2 bg-white rounded-full p-1.5 pr-4 border border-[#e5e7eb] shadow-sm relative -top-1">
                <span className="flex -space-x-2">
                  <NextImage
                    src="https://i.pravatar.cc/100?img=11"
                    alt="Avatar"
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full border-2 border-white object-cover"
                  />
                  <NextImage
                    src="https://i.pravatar.cc/100?img=12"
                    alt="Avatar"
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full border-2 border-white object-cover"
                  />
                </span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="ml-3 text-[#111111]"
                >
                  <path
                    d="M13 17L18 12L13 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 17L11 12L6 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Mentors
            </motion.h1>

            {/* Body */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[16px] lg:text-[18px] text-[#171717] leading-[1.45] max-w-[600px]"
            >
              Get access to all courses for just <strong>$10/month</strong>.
              Includes guaranteed internship and job placement for all programs
              (excluding AAN Open). Already a professional? Join our standalone
              Career Accelerator program.
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-[28px] pt-4 w-full sm:w-auto"
            >
              <Link
                href="/#programs"
                className="w-full sm:w-auto px-[20px] py-[16px] bg-[#111111] text-white rounded-[8px] font-medium text-[16px] flex items-center justify-center hover:bg-black transition-colors shadow-sm"
              >
                Start Learning
              </Link>
              <Link
                href="/#contact"
                className="w-full sm:w-auto text-[#111111] font-medium text-[16px] flex items-center justify-center gap-3 hover:opacity-70 transition-opacity group"
              >
                Watch Video
                <div className="w-[40px] h-[40px] rounded-full border border-[#111111] flex items-center justify-center group-hover:bg-[#111111] group-hover:text-white transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            </motion.div>
          </div>

          {/* Right Column: Visual Composition (approx 52%) */}
          <div className="w-full lg:w-[52%] relative flex items-center justify-center lg:justify-end mt-12 lg:mt-0 min-h-[500px] lg:min-h-[600px]">
            {/* Decorative Crosses - Top Right Anchor */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute top-10 right-4 lg:-right-4 hidden lg:block z-0 pointer-events-none opacity-40"
            >
              <div className="flex gap-4 mb-4 text-[#60a5fa] text-lg font-bold tracking-widest">
                + + +
              </div>
              <div className="flex gap-4 mb-4 text-[#60a5fa] text-lg ml-4 font-bold tracking-widest">
                + +
              </div>
              <div className="flex gap-4 text-[#60a5fa] text-lg ml-8 font-bold tracking-widest">
                +
              </div>
            </motion.div>

            {/* Decorative Crosses - Bottom Left Anchor */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{
                repeat: Infinity,
                duration: 5,
                ease: 'easeInOut',
                delay: 1,
              }}
              className="absolute bottom-20 left-10 lg:-left-4 hidden lg:block z-0 pointer-events-none opacity-30"
            >
              <div className="flex gap-4 mb-4 text-[#60a5fa] text-lg font-bold tracking-widest">
                + +
              </div>
              <div className="flex gap-4 text-[#60a5fa] text-lg ml-4 font-bold tracking-widest">
                + +
              </div>
            </motion.div>

            <div className="relative w-full max-w-[450px] lg:max-w-[500px] lg:mr-12">
              {/* Decorative Shape behind Blurry Image */}
              <div className="absolute -top-[30px] -left-[30px] lg:-top-[20px] lg:-left-[60px] w-[140px] h-[150px] lg:w-[160px] lg:h-[180px] bg-[#e0e7ff] rounded-[12px] z-10 hidden lg:block opacity-60" />

              {/* Background Blurry Image - Top Left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute -top-[40px] -left-[40px] lg:-top-[40px] lg:-left-[80px] w-[140px] h-[150px] lg:w-[160px] lg:h-[180px] rounded-[12px] overflow-hidden shadow-sm z-20"
              >
                <NextImage
                  src="/landing/hero_bg_blurry_generated.jpg"
                  alt="Student working"
                  fill
                  className="object-cover blur-[3px] opacity-90"
                />
              </motion.div>

              {/* Main Instructor Image */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="relative z-10 w-full aspect-[4/4.5] md:aspect-[4/3.5] lg:aspect-[4/4.5] rounded-[12px] overflow-hidden bg-gray-200 shadow-[0_20px_40px_rgb(0,0,0,0.08)]"
              >
                <NextImage
                  src="/landing/hero_man_laptop.jpg"
                  alt="Instructor smiling"
                  fill
                  className="object-cover object-top"
                  priority
                />
              </motion.div>

              {/* Floating Mentor Card - Bottom Left */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute -bottom-[20px] -left-[20px] lg:-bottom-[30px] lg:-left-[60px] z-20 w-[215px] bg-white rounded-[9px] p-4 shadow-[0_10px_30px_rgb(0,0,0,0.05)] border border-gray-100"
              >
                <p className="text-[#111111] font-bold text-[15px] mb-3">
                  Frontend Development
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0">
                    <NextImage
                      src="https://i.pravatar.cc/100?img=33"
                      alt="Dennis Barrett"
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[13px] font-semibold text-[#111111]">
                      Dennis Barrett
                    </p>
                    <p className="text-[11px] font-medium text-[#555555] flex items-center gap-1.5 mt-0.5">
                      <svg
                        width="10"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="opacity-70"
                      >
                        <path
                          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                        <polyline
                          points="14 2 14 8 20 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></polyline>
                        <line
                          x1="16"
                          y1="13"
                          x2="8"
                          y2="13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></line>
                        <line
                          x1="16"
                          y1="17"
                          x2="8"
                          y2="17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></line>
                        <polyline
                          points="10 9 9 9 8 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></polyline>
                      </svg>
                      123 Courses
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Small Bottom Image - Bottom Right */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="absolute -bottom-[20px] -right-[10px] lg:-bottom-[40px] lg:-right-[40px] z-20 w-[140px] h-[170px] lg:w-[170px] lg:h-[210px] rounded-[10px] overflow-hidden shadow-[0_15px_30px_rgb(0,0,0,0.1)] border-[4px] border-white"
              >
                <NextImage
                  src="https://i.pravatar.cc/300?img=11"
                  alt="Student"
                  fill
                  className="object-cover"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Strip (Clean layout, no border box, larger logos) */}
      <div className="w-full relative z-10 pt-8 pb-20">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-wrap items-center justify-center gap-16 lg:gap-32 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <NextImage
            src="/landing/talent_partner.png"
            alt="Talent Partner"
            width={220}
            height={70}
            className="h-12 lg:h-16 w-auto object-contain"
          />
          <NextImage
            src="/landing/trellissoft.png"
            alt="Trellissoft"
            width={200}
            height={70}
            className="h-12 lg:h-16 w-auto object-contain"
          />
          <NextImage
            src="/landing/calabar.png"
            alt="University of Calabar"
            width={200}
            height={70}
            className="h-12 lg:h-16 w-auto object-contain"
          />
        </div>
      </div>
    </div>
  )
}
