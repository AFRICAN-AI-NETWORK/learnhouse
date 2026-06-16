'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import {
  MonitorPlay,
  Smartphone,
  Cloud,
  ShieldCheck,
  PenTool,
  Image as ImageIcon,
  Video,
  LineChart,
  Briefcase,
  LayoutTemplate,
} from 'lucide-react'

// Helper function to get an icon based on specialization name
const getIconForSpec = (name: string) => {
  const iconProps = { size: 28, className: 'text-[#0057ff]' }
  if (name.includes('Full Stack')) return <MonitorPlay {...iconProps} />
  if (name.includes('Mobile')) return <Smartphone {...iconProps} />
  if (name.includes('Cloud')) return <Cloud {...iconProps} />
  if (name.includes('Cyber')) return <ShieldCheck {...iconProps} />
  if (name.includes('UI/UX')) return <LayoutTemplate {...iconProps} />
  if (name.includes('Graphic')) return <PenTool {...iconProps} />
  if (name.includes('Video')) return <Video {...iconProps} />
  if (name.includes('Digital')) return <LineChart {...iconProps} />
  if (name.includes('Product')) return <Briefcase {...iconProps} />
  if (name.includes('Project')) return <Briefcase {...iconProps} />
  return <ImageIcon {...iconProps} />
}

interface TechSpecialization {
  name: string
  description: string
  image: string // We keep the prop for backwards compatibility but ignore it in render
}

interface TechSpecializationsSectionProps {
  specializations: TechSpecialization[]
  orgslug: string
  bgColor?: string
}

export default function TechSpecializationsSection({
  specializations,
  orgslug,
  bgColor = 'bg-white',
}: TechSpecializationsSectionProps) {
  if (!specializations || specializations.length === 0) return null

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <section
      id="specializations"
      className={`py-24 px-6 lg:px-12 ${bgColor} border-y border-gray-100`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/10 text-[#0057ff] text-xs font-bold uppercase tracking-widest">
            Specializations
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-[#0a0f1e]">
            Explore Our Top <span className="text-[#0057ff]">Categories</span>
          </h2>
          <p className="text-[#555555] max-w-2xl mx-auto text-[16px]">
            We prepare students for high-impact roles across the modern
            technology landscape. Pick your path and start building.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {specializations.map((spec, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col bg-[#f9fafb] border border-gray-100 rounded-2xl p-6 hover:shadow-[rgba(0,87,255,0.12)_0px_8px_24px_0px] hover:border-[#0057ff]/30 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {getIconForSpec(spec.name)}
              </div>
              <h3 className="font-bold text-[#0a0f1e] text-[16px] mb-3">
                {spec.name}
              </h3>
              <p className="text-[13px] text-[#555555] leading-relaxed mb-6 flex-grow">
                {spec.description}
              </p>

              <span className="inline-flex items-center text-[#0057ff]/60 text-[13px] font-bold mt-auto uppercase tracking-wider">
                Coming Soon
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
