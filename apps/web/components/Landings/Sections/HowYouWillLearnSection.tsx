'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Video, Users, Briefcase, Smartphone, Target } from 'lucide-react'

export default function HowYouWillLearnSection() {
  const blocks = [
    {
      id: '01',
      title: 'Live online classes',
      description:
        'Learn through interactive virtual sessions led by experienced instructors. Ask questions in real time, collaborate with other students, and build practical skills step by step.',
      color: 'text-[#ea580c]',
      bg: 'bg-[#ffedd5]',
      border: 'border-[#fdba74]/30',
      icon: <Video className="w-8 h-8" />,
    },
    {
      id: '02',
      title: 'Mentorship from industry professionals',
      description:
        'Get guidance from experts actively working in tech. Learn industry best practices, receive feedback on your work, and gain insights that go beyond theory.',
      color: 'text-[#0284c7]',
      bg: 'bg-[#e0f2fe]',
      border: 'border-[#7dd3fc]/30',
      icon: <Users className="w-8 h-8" />,
    },
    {
      id: '03',
      title: 'Hands-on projects & portfolio building',
      description:
        'Work on practical projects designed to simulate real-world tasks. Graduate with a portfolio that helps you showcase your skills to employers and clients.',
      color: 'text-[#9333ea]',
      bg: 'bg-[#f3e8ff]',
      border: 'border-[#d8b4fe]/30',
      icon: <Briefcase className="w-8 h-8" />,
    },
    {
      id: '04',
      title: 'Mobile-first, offline-ready',
      description:
        "Access lessons anywhere without relying on constant internet. Our web platform is fully offline-ready, and we're launching dedicated iOS & Android apps in 2 weeks for the ultimate mobile experience.",
      color: 'text-[#16a34a]',
      bg: 'bg-[#dcfce7]',
      border: 'border-[#86efac]/30',
      icon: <Smartphone className="w-8 h-8" />,
    },
    {
      id: '05',
      title: 'Career guidance & job support',
      description:
        'Receive CV reviews, interview preparation, LinkedIn optimisation, and career support to help you confidently apply for tech jobs, internships, and freelance opportunities.',
      color: 'text-[#111827]',
      bg: 'bg-[#f3f4f6]',
      border: 'border-[#e5e7eb]',
      icon: <Target className="w-8 h-8" />,
    },
  ]

  return (
    <section id="methodology" className="py-32 px-6 lg:px-12 bg-white">
      <div className="max-w-[1280px] mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-4 mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f5ff] text-[#0057ff] text-[13px] font-bold tracking-wide">
            How You Will Learn
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-[#111827] tracking-tight leading-[1.1]">
            Built for people with jobs,
            <br />
            lives, and real goals.
          </h2>
          <p className="text-[#555555] text-[18px] leading-relaxed pt-4">
            Every programme combines live instruction, expert mentorship, and
            hands-on projects so you build real skills, not just familiarity.
          </p>
        </div>

        {/* Zig Zag Flow */}
        <div className="flex flex-col gap-32">
          {blocks.map((block, i) => {
            const isEven = i % 2 !== 0
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: '-100px' }}
                className={`flex flex-col ${
                  isEven ? 'md:flex-row-reverse' : 'md:flex-row'
                } items-center gap-16 lg:gap-24`}
              >
                {/* Visual Anchor */}
                <div
                  className={`relative w-full md:w-1/2 flex justify-center items-center aspect-[4/3] rounded-[48px] ${block.bg} border ${block.border}`}
                >
                  <div className="absolute top-10 left-10">
                    <div
                      className={`w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm ${block.color}`}
                    >
                      {block.icon}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <span
                      className={`text-[180px] leading-none font-black ${block.color} opacity-10 tracking-tighter`}
                    >
                      {block.id}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="w-full md:w-1/2 flex flex-col space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-[2px] bg-gray-200" />
                    <span
                      className={`text-[13px] font-bold tracking-widest uppercase ${block.color}`}
                    >
                      Step {block.id}
                    </span>
                  </div>
                  <h3 className="text-3xl md:text-[40px] font-bold text-[#111827] leading-[1.1] tracking-tight">
                    {block.title}
                  </h3>
                  <p className="text-[17px] text-[#555555] leading-[1.7] max-w-[480px]">
                    {block.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
