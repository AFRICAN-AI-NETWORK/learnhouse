'use client'

import React from 'react'
import { motion } from 'framer-motion'
import CourseThumbnailLanding from '@components/Objects/Thumbnails/CourseThumbnailLanding'

interface CourseSectionProps {
  title: string
  description?: string
  courses: any[]
  orgslug: string
  bgColor?: string
}

export default function CourseSection({
  title,
  description,
  courses,
  orgslug,
  bgColor = 'bg-white',
}: CourseSectionProps) {
  if (!courses || courses.length === 0) return null

  return (
    <section className={`py-24 px-6 lg:px-12 ${bgColor}`}>
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
          {courses.map((course: any) => (
            <CourseThumbnailLanding
              key={course.course_uuid}
              course={course}
              orgslug={orgslug}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
