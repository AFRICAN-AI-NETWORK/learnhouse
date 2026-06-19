'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

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
}

interface ActiveProgramsSectionProps {
  programs: ActiveProgram[]
  orgslug: string
}

export default function ActiveProgramsSection({
  programs,
  orgslug,
}: ActiveProgramsSectionProps) {
  if (!programs || programs.length === 0) return null

  return (
    <section
      id="programs"
      className="py-24 px-6 lg:px-12 bg-[#f9fafb] border-y border-gray-100"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest">
            Live & Upcoming
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
            Active <span className="text-[#0057ff]">Programs</span>
          </h2>
          <p className="text-[#555555] max-w-2xl mx-auto text-[16px]">
            Start learning today with our open access directory or prepare for
            our highly anticipated premium tracks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((program, i) => (
            <motion.div
              key={program.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="flex flex-col rounded-[24px] overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {/* Top Image Half */}
              <div className="relative h-56 w-full flex items-center justify-center overflow-hidden bg-gray-100">
                <img
                  src={program.imageUrl}
                  alt={program.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
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

                <Link
                  href={program.href}
                  className={`self-start px-6 py-2 text-sm font-bold rounded-full transition-colors duration-300 flex items-center justify-center ${program.buttonColor || 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                >
                  Learn more &rarr;
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
