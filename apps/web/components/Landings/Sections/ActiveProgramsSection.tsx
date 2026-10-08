'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, Users } from 'lucide-react'
import NextImage from 'next/image'

interface ActiveProgram {
  id: string
  name: string
  description: string
  badgeText: string
  buttonText: string
  href: string
  imageUrl: string
  status?: 'Live' | 'Upcoming'
  originalPrice?: string
}

interface ActiveProgramsSectionProps {
  programs: ActiveProgram[]
  orgslug: string
}

// Map program ids to specific EduLink-style pastel colors for the image container
const programStyles: Record<string, string> = {
  'aan-open': 'bg-[#e2f5ee]', // soft mint green
  'ai-automation-businesses': 'bg-[#ffe8b3]', // soft orange/yellow
  'ai-automation-content-creators': 'bg-[#ffd6e0]', // soft pink
  'aan-fundamentals': 'bg-[#e2f5ee]',
  'ai-engineering': 'bg-[#e2eafc]', // soft blue
  'frontend-dev': 'bg-[#d8e2dc]',
  'nodejs-backend': 'bg-[#e0e7ff]',
  'laravel-backend': 'bg-[#ffe4e6]',
  'video-production': 'bg-[#ffedd5]',
  'fullstack-dev': 'bg-[#f1f5f9]',
  'mobile-app': 'bg-[#e0f2fe]',
  'cloud-computing': 'bg-[#ffedd5]',
  'cyber-security': 'bg-[#f3f4f6]',
  'ui-ux-design': 'bg-[#fae8ff]',
  'graphic-design': 'bg-[#e2f5ee]',
  'digital-marketing': 'bg-[#dbeafe]',
  'product-management': 'bg-[#fef3c7]',
  'project-management': 'bg-[#ecfccb]',
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
    <section id="programs" className="py-32 px-6 lg:px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-8">
            Browse our courses
          </h2>

          {/* Toggle / Tabs (EduLink style uses simple right aligned button, but we keep tabs for functionality) */}
          <div className="flex items-center justify-between w-full border-b border-gray-200 pb-4">
            <div className="flex gap-8">
              {['Live', 'Upcoming'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'Live' | 'Upcoming')}
                  className={`relative pb-4 text-[16px] font-bold transition-colors ${
                    activeTab === tab
                      ? 'text-[#111827]'
                      : 'text-gray-400 hover:text-[#111827]'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#111827]"
                    />
                  )}
                </button>
              ))}
            </div>
            <Link
              href="/#programs"
              className="hidden md:inline-flex px-6 py-2.5 bg-[#111827] text-white text-[14px] font-bold rounded-lg hover:bg-black transition-colors"
            >
              View all courses
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredPrograms.map((program, i) => {
              const bgClass = programStyles[program.id] || 'bg-[#e2f5ee]'

              return (
                <motion.div
                  layout
                  key={program.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative flex flex-col bg-white rounded-[24px] shadow-sm hover:shadow-[8px_8px_0px_#000] hover:-translate-y-1 transition-all duration-300 border-2 border-gray-100 hover:border-black"
                >
                  {/* Top Image Container (EduLink Pastel Style) */}
                  <div
                    className={`w-auto h-[240px] relative overflow-hidden ${bgClass} m-3 rounded-[16px]`}
                  >
                    {/* Fake isolated look by applying blend modes or just centering */}
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <NextImage
                        src={program.imageUrl || 'https://i.pravatar.cc/100'}
                        alt={program.name}
                        fill
                        className="object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-500 origin-center"
                      />
                    </div>

                    {/* EduLink Author Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <div className="flex items-center gap-2 bg-white rounded-full pr-4 p-1 shadow-sm border border-gray-100">
                        <NextImage
                          src={`https://i.pravatar.cc/100?img=${i + 10}`}
                          alt="Instructor"
                          width={24}
                          height={24}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-[12px] font-bold text-[#111827]">
                          AINA Mentor
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content (EduLink Style) */}
                  <div className="flex-1 flex flex-col p-6 pt-4">
                    <h3 className="text-[20px] font-bold text-[#111827] mb-2 leading-tight group-hover:text-[#0057ff] transition-colors line-clamp-2">
                      {program.name.replace(/\s\([^)]+\)/g, '')}
                    </h3>

                    <p className="text-[14px] text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {program.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-medium text-gray-500 mb-6">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-gray-400" />{' '}
                        {program.id === 'aan-open' ? '10' : '24'} Modules
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" /> Self-paced
                      </span>
                      {program.id !== 'aan-open' && (
                        <span className="flex items-center gap-1.5">
                          <Users size={14} className="text-gray-400" /> Job
                          Placement
                        </span>
                      )}
                    </div>

                    <div className="mt-auto pt-6 flex items-center justify-between">
                      {program.status === 'Upcoming' ? (
                        <div className="text-[16px] font-bold text-gray-400">
                          Coming Soon
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[18px] font-black text-[#65a30d]">
                            {program.badgeText}
                            {program.originalPrice && (
                              <span className="text-[12px] text-gray-400 font-medium line-through ml-2">
                                {program.originalPrice}
                              </span>
                            )}
                          </span>
                          <Link
                            href={program.href}
                            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[#111827] group-hover:bg-[#111827] group-hover:text-white transition-colors"
                          >
                            <ArrowRight size={18} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
