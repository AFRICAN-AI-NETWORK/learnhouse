'use client'

import React from 'react'
import { ArrowRight, Smartphone } from 'lucide-react'

export default function MobileAppLaunchSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        {/* Left Side: Copy & Launch Info */}
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-sm uppercase tracking-widest mx-auto lg:mx-0">
            <Smartphone size={16} />
            Upcoming Activity
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-[#0a0f1e] tracking-tight leading-[1.1] uppercase">
            LEARN ON THE GO.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 uppercase">
              ANYWHERE, ANYTIME.
            </span>
          </h2>

          <p className="text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            We are building a truly mobile-first learning experience. Access
            your courses, join live sessions, and track your progress straight
            from your pocket. The wait is almost over.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <div className="px-8 py-4 bg-[#0a0f1e] text-white rounded-xl font-bold text-[15px] shadow-2xl flex items-center justify-center gap-2 w-full sm:w-auto">
              Launching July 30th <ArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* Right Side: The Mockup */}
        <div className="flex-1 w-full max-w-[500px] lg:max-w-none relative">
          {/* Decorative Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl -z-10 opacity-70" />

          <img
            src="/landing/aina_mobile_mockup.png"
            alt="Learnhouse Mobile App Mockup"
            className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] transform transition-transform hover:scale-[1.02] duration-700"
          />
        </div>
      </div>
    </section>
  )
}
