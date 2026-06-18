'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function HowYouWillLearnSection() {
  const blocks = [
    {
      id: 1,
      title: 'Live online classes',
      description:
        'Learn through interactive virtual sessions led by experienced instructors. Ask questions in real time, collaborate with other students, and build practical skills step by step.',
      bgColor: 'bg-rose-50',
      badgeColor: 'text-rose-500',
      gridClass: 'md:col-span-6',
    },
    {
      id: 2,
      title: 'Mentorship from industry professionals',
      description:
        'Get guidance from experts actively working in tech. Learn industry best practices, receive feedback on your work, and gain insights that go beyond theory.',
      bgColor: 'bg-amber-50',
      badgeColor: 'text-amber-500',
      gridClass: 'md:col-span-6',
    },
    {
      id: 3,
      title: 'Hands-on projects & portfolio building',
      description:
        'Work on practical projects designed to simulate real-world tasks. Graduate with a portfolio that helps you showcase your skills to employers and clients.',
      bgColor: 'bg-indigo-50',
      badgeColor: 'text-indigo-500',
      gridClass: 'md:col-span-4',
    },
    {
      id: 4,
      title: 'Mobile-first, offline-ready',
      description:
        "Access lessons anywhere without relying on constant internet. Our web platform is fully offline-ready, and we're launching dedicated iOS & Android apps in 2 weeks for the ultimate mobile experience.",
      bgColor: 'bg-emerald-50',
      badgeColor: 'text-emerald-500',
      gridClass: 'md:col-span-4',
    },
    {
      id: 5,
      title: 'Career guidance & job support',
      description:
        'Receive CV reviews, interview preparation, LinkedIn optimisation, and career support to help you confidently apply for tech jobs, internships, and freelance opportunities.',
      bgColor: 'bg-blue-50',
      badgeColor: 'text-[#0057ff]',
      gridClass: 'md:col-span-4',
    },
  ]

  return (
    <section id="methodology" className="py-24 px-6 lg:px-12 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest">
            How You Will Learn
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e] uppercase">
            Built for people with jobs,{' '}
            <span className="text-[#0057ff]">lives, and real goals.</span>
          </h2>
          <p className="text-[#555555] max-w-2xl mx-auto text-[16px]">
            Every programme combines live instruction, expert mentorship, and
            hands-on projects so you build real skills, not just familiarity.
          </p>
        </div>

        {/* Bento Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {blocks.map((block, i) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`p-8 rounded-[24px] ${block.bgColor} ${block.gridClass} flex flex-col`}
            >
              <div className="mb-6">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-[15px] shadow-sm">
                  <span className={block.badgeColor}>{block.id}</span>
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-[#0a0f1e] mb-3">
                {block.title}
              </h3>
              <p className="text-[#555555] text-[14px] leading-relaxed">
                {block.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
