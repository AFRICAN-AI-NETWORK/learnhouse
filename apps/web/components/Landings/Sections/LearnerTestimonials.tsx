'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import { testimonials } from '@/data/testimonials'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-[#ffb703] text-[#ffb703]' : 'text-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

export default function LearnerTestimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  // Auto-play the slider

  const nextSlide = () => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevSlide = () => {
    setDirection(-1)
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    )
  }

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 6000)
    return () => clearInterval(timer)
  }, [currentIndex])

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-white py-32 px-6"
    >
      {/* Decorative Background Blob */}
      <div className="absolute top-0 right-0 w-1/3 h-[50vh] bg-[#e6f0fa] rounded-bl-[100px] z-0 hidden lg:block opacity-60" />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f5ff] text-[#0057ff] text-[13px] font-bold tracking-wide">
              Testimonials
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight leading-[1.1]">
              What our <br className="hidden md:block" />
              students say
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={prevSlide}
              className="w-14 h-14 rounded-full border border-gray-200 bg-white flex items-center justify-center text-[#111827] hover:bg-[#111827] hover:text-white transition-all shadow-sm"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextSlide}
              className="w-14 h-14 rounded-full border border-gray-200 bg-white flex items-center justify-center text-[#111827] hover:bg-[#111827] hover:text-white transition-all shadow-sm"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Carousel Container */}
        <div className="relative w-full">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="w-full"
            >
              <div className="w-full bg-white p-8 md:p-16 rounded-[40px] border border-gray-100 shadow-[0_8px_40px_rgb(0,0,0,0.06)] grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center md:min-h-[500px]">
                {/* Image / Avatar Column */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-12">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-[#e6f0fa] flex items-center justify-center border-4 border-white shadow-lg overflow-hidden text-2xl font-bold text-[#0057ff]">
                      {currentTestimonial.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                      <Quote
                        size={20}
                        className="text-[#0057ff]"
                        fill="#0057ff"
                      />
                    </div>
                  </div>
                  <h3 className="text-[20px] font-bold text-[#111827]">
                    {currentTestimonial.name}
                  </h3>
                  <p className="text-[14px] font-medium text-[#0057ff] mt-1 mb-6">
                    {currentTestimonial.course}
                  </p>
                  <Stars rating={currentTestimonial.rating} />
                </div>

                {/* Quote Column */}
                <div className="md:col-span-8 flex flex-col justify-center">
                  <Quote size={48} className="text-gray-100 mb-6" />
                  <p className="text-[22px] md:text-[28px] leading-[1.6] text-[#111827] font-serif font-medium">
                    "{currentTestimonial.testimonial}"
                  </p>
                  {currentTestimonial.challenge && (
                    <div className="mt-8 pt-8 border-t border-gray-50 flex gap-4 opacity-70">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2">
                          Before AINA
                        </p>
                        <p className="text-[14px] text-gray-500 leading-relaxed">
                          {currentTestimonial.challenge}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center items-center gap-2 mt-12">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentIndex ? 1 : -1)
                setCurrentIndex(i)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === i
                  ? 'w-10 bg-[#0057ff]'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
