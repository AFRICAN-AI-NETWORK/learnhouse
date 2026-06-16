'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface UpcomingCourse {
  name: string
  description: string
  image: string
  badgeText: string
  badgeColor?: string // e.g. bg-amber-500
}

interface UpcomingCourseSectionProps {
  title: string
  description?: string
  courses: UpcomingCourse[]
  bgColor?: string
}

export default function UpcomingCourseSection({
  title,
  description,
  courses,
  bgColor = 'bg-[#f9fafb]',
}: UpcomingCourseSectionProps) {
  if (!courses || courses.length === 0) return null

  return (
    <section
      className={`py-24 px-6 lg:px-12 ${bgColor} border-y border-gray-100`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="space-y-4 mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0f1e]">
            {title}
          </h2>
          {description && (
            <p className="text-[#555555] text-[16px] max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 place-items-center"
        >
          {courses.map((course, index) => (
            <motion.div
              key={index}
              className="relative flex flex-col bg-white rounded-xl shadow-[rgba(0,0,0,0.06)_0px_2px_12px_0px] overflow-hidden min-w-[280px] w-full max-w-sm hover:shadow-[rgba(0,87,255,0.22)_0px_4px_14px_0px] transition-shadow duration-300 group"
            >
              <div
                className="relative ring-1 ring-inset ring-black/10 rounded-t-xl w-full aspect-video bg-cover bg-center overflow-hidden"
                style={{ backgroundImage: `url(${course.image})` }}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />
                <div
                  className={`absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider shadow-sm ${course.badgeColor || 'bg-[#0057ff]/90 border border-[#0057ff]/50'}`}
                >
                  {course.badgeText}
                </div>
              </div>
              <div className="flex flex-col w-full p-5 space-y-3">
                <div className="space-y-2">
                  <h2 className="font-bold text-[#0a0f1e] leading-tight text-lg min-h-[44px] line-clamp-2">
                    {course.name}
                  </h2>
                  <p className="text-[13px] text-[#555555] leading-relaxed min-h-[60px] line-clamp-3">
                    {course.description}
                  </p>
                </div>

                <button
                  disabled
                  className="inline-flex items-center justify-center w-full px-4 py-2 mt-2 bg-gray-100 text-gray-500 text-[13px] font-semibold rounded-lg cursor-not-allowed"
                >
                  Coming Soon
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
