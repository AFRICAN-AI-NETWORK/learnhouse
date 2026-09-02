'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import NextImage from 'next/image'

interface ActiveProgram {
  id: string
  name: string
  description: string
  badgeText: string
  badgeColor?: string // bg class
  buttonColor?: string // bg and text class for the button
  buttonText: string
  href: string
  imageUrl: string // Used to show the generated image
  status?: 'Live' | 'Upcoming'
}

interface ActiveProgramsSectionProps {
  programs: ActiveProgram[]
  orgslug: string
}

export default function ActiveProgramsSection({
  programs,
  orgslug,
}: ActiveProgramsSectionProps) {
  const [activeTab, setActiveTab] = useState<'Live' | 'Upcoming'>('Live')

  if (!programs || programs.length === 0) return null

  const filteredPrograms = programs.filter(
    (p) => p.status === activeTab || (!p.status && activeTab === 'Live')
  )

  return (
    <section
      id="programs"
      className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest">
            {activeTab} Programs
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
            Active <span className="text-[#0057ff]">Programs</span>
          </h2>
          <p className="text-[#555555] max-w-2xl mx-auto text-[16px]">
            Start learning today with our open access directory or prepare for
            our highly anticipated upcoming premium tracks.
          </p>
        </div>

        {/* Toggle / Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white p-1.5 rounded-full border border-gray-200 shadow-sm relative">
            {['Live', 'Upcoming'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'Live' | 'Upcoming')}
                className={`relative z-10 px-6 py-2.5 text-sm font-bold uppercase tracking-widest rounded-full transition-colors duration-300 ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-[#555555] hover:text-[#0a0f1e]'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeProgramTab"
                    className="absolute inset-0 bg-[#0a0f1e] rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="flex items-center gap-2">
                  {tab === 'Live' && activeTab === tab && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  {tab}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((program, i) => (
              <motion.div
                layout
                key={program.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex flex-col rounded-[24px] overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                {/* Top Image Half */}
                <div className="relative h-56 w-full flex items-center justify-center overflow-hidden bg-gray-100">
                  <span
                    className={`absolute top-4 left-4 z-10 inline-flex items-center rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-black/10 ${
                      program.badgeText === 'Free'
                        ? 'bg-emerald-500'
                        : program.badgeText === 'Paid'
                          ? 'bg-blue-600'
                          : program.badgeColor || 'bg-black/70'
                    }`}
                  >
                    {program.badgeText}
                  </span>
                  <NextImage
                    src={program.imageUrl}
                    alt={program.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105 z-0"
                    width={800}
                    height={800}
                  />

                  {/* Bottom Right Colored Tab */}
                  <div
                    className={`absolute bottom-0 right-0 w-8 h-8 rounded-tl-xl ${program.badgeColor || 'bg-emerald-500'}`}
                  />
                </div>

                {/* Bottom White Half */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  <div className="mb-6">
                    <h3 className="text-[20px] font-black text-[#0a0f1e] mb-3">
                      {program.name}
                    </h3>
                    <p className="text-[#555555] text-[14px] leading-relaxed line-clamp-3">
                      {program.description}
                    </p>
                  </div>

                  {program.status === 'Upcoming' ? (
                    <div
                      className={`group relative self-start px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 flex items-center justify-center cursor-not-allowed overflow-hidden ${program.buttonColor || 'bg-gray-100 text-gray-500'}`}
                    >
                      <span className="group-hover:translate-y-[-150%] transition-transform duration-300">
                        Locked
                      </span>
                      <span className="absolute inset-0 flex items-center justify-center translate-y-[150%] group-hover:translate-y-0 transition-transform duration-300">
                        Coming soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={program.href}
                      className={`self-start px-6 py-2 text-sm font-bold rounded-full transition-colors duration-300 flex items-center justify-center ${program.buttonColor || 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                    >
                      {program.buttonText || 'Learn more \u2192'}
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
