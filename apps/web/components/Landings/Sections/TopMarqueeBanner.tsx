'use client'

import React from 'react'
import { Rocket } from 'lucide-react'
import Marquee from 'react-fast-marquee'

export default function TopMarqueeBanner() {
  return (
    <div className="bg-[#0a0f1e] text-white py-2 border-b border-white/10 relative z-[60]">
      <Marquee gradient={false} speed={40} className="overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 mx-8">
            <Rocket size={16} className="text-[#0057ff]" />
            <span className="text-sm font-bold tracking-wide">
              BIG NEWS: Our Mobile App is launching on 31st August!
            </span>
            <span className="text-sm text-white/60">
              Get ready for a truly mobile-first learning experience.
            </span>
          </div>
        ))}
      </Marquee>
    </div>
  )
}
