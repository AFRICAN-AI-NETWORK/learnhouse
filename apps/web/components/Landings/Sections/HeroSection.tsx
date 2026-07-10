'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Sparkles,
  ArrowRight,
  Cpu,
  CheckCircle2,
  Users,
  Layers,
  Zap,
} from 'lucide-react'

interface HeroSectionProps {
  org: any
  orgslug: string
}

const animatedCards = [
  {
    id: 1,
    title: 'AI Fundamentals',
    subtitle: 'Master the core concepts',
    icon: <Cpu size={24} />,
    color: 'text-[#4da6ff]',
    bg: 'bg-[#0057ff]/20',
    topics: [
      'Programming Essentials for AI',
      'Mathematics for Machine Learning',
      'Data Structures & Algorithms',
    ],
  },
  {
    id: 2,
    title: 'AI Automation',
    subtitle: 'Build automated workflows',
    icon: <Zap size={24} />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    topics: [
      'Make, Zapier & n8n',
      'Python Scripts & APIs',
      'Live Client Projects',
    ],
  },
  {
    id: 3,
    title: 'AAN OPEN',
    subtitle: 'Your gateway to AI',
    icon: <Layers size={24} />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    topics: [
      'AI Ecosystem Access',
      'Curated Tool Directory',
      'Community Foundations',
    ],
  },
]

export default function HeroSection({ org, orgslug }: HeroSectionProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCardIndex((prev) => (prev + 1) % animatedCards.length)
    }, 4000) // Switch every 4 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative pt-24 pb-20 px-6 lg:px-12 overflow-hidden bg-[#0a0f1e] text-white min-h-[90vh] flex items-center">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: "url('/landing/hero_bg.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f1e]/50 to-[#0a0f1e]" />
      </div>

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 z-10"
        >
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/20 text-[#4da6ff] text-xs font-bold uppercase tracking-widest border border-[#0057ff]/30 backdrop-blur-md">
              <Sparkles size={14} /> The Future of Learning
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-gray-300 text-xs font-bold border border-white/10 backdrop-blur-md">
              <Users size={14} className="text-amber-400" /> Joined by 5000+
              Learners
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] uppercase">
            Accelerate Your Career In The{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-[#4da6ff]">
              New Economy
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-xl font-normal leading-relaxed">
            Master artificial intelligence, software engineering, and the most
            in-demand tech skills with {org?.name || 'Labano Academy'}.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link
              href="/#programs"
              className="w-full sm:w-auto px-8 py-4 bg-[#0057ff] text-white rounded-[12px] font-semibold text-[14px] flex items-center justify-center gap-3 hover:bg-[#0046cc] hover:shadow-[0_0_20px_-5px_rgba(0,87,255,0.5)] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Browse Programs
              <ArrowRight
                size={18}
                className="translate-x-0 group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white border border-white/20 backdrop-blur-sm rounded-[12px] font-semibold text-[14px] flex items-center justify-center hover:bg-white/20 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Join the Community
            </Link>
          </div>
        </motion.div>

        {/* Animated Carousel Bento Box */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block h-[400px] perspective-[1000px]"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0057ff]/20 to-transparent rounded-[28px] -rotate-3 scale-105" />

          <div className="relative h-full w-full">
            <AnimatePresence mode="wait">
              {animatedCards.map((card, index) => {
                if (index !== currentCardIndex) return null
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="absolute inset-0 bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-[28px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.5)] flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-[12px] ${card.bg} flex items-center justify-center ${card.color}`}
                        >
                          {card.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-[16px]">
                            {card.title}
                          </h3>
                          <p className="text-gray-400 text-[13px]">
                            {card.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {animatedCards.map((_, dotIndex) => (
                          <div
                            key={dotIndex}
                            className={`h-1.5 rounded-full transition-all duration-500 ${dotIndex === currentCardIndex ? 'w-6 bg-[#0057ff]' : 'w-2 bg-white/20'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 flex-grow flex flex-col justify-center">
                      {card.topics.map((topic, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 + 0.2 }}
                          className="min-h-16 rounded-[12px] bg-white/5 border border-white/10 flex items-center px-4 py-3 gap-4"
                        >
                          <div
                            className={`flex-shrink-0 w-8 h-8 rounded-full ${card.bg} flex items-center justify-center ${card.color}`}
                          >
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="text-[13px] font-bold text-gray-200 leading-snug">
                            {topic}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
