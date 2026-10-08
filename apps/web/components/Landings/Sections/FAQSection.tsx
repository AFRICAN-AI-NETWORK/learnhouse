'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'

const faqs = [
  {
    question: 'Do I need prior coding experience?',
    answer:
      'No, our foundational tracks are designed for absolute beginners. We start from the basics and gradually move to advanced concepts.',
  },
  {
    question: 'Are the programs fully online?',
    answer:
      'Yes, all our programs are 100% online, combining self-paced learning modules with live cohort-based sessions.',
  },
  {
    question: 'How do the internship opportunities work?',
    answer:
      'Upon successful completion of the core tracks and capstone projects, eligible students are matched with our partner organizations for practical internship experience.',
  },
  {
    question: 'Is there a certificate upon completion?',
    answer:
      'Yes! You will receive a verifiable digital certificate upon completing your track, which you can add to your resume and LinkedIn profile.',
  },
  {
    question: 'How does the laptop giveaway work?',
    answer:
      'We provide laptops to outstanding students who meet specific academic and participation requirements during the foundational stages of the premium programs.',
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-32 px-6 lg:px-12 bg-white">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Side: Header */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f3f4f6] text-[#555555] text-[13px] font-bold tracking-wide">
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight leading-[1.1]">
            Frequently <br /> Asked Questions
          </h2>
          <p className="text-[#555555] text-[17px] leading-[1.7] max-w-sm">
            Everything you need to know about learning with us. Can't find the
            answer you're looking for? Reach out to our team.
          </p>
        </div>

        {/* Right Side: Accordions */}
        <div className="lg:col-span-7 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className={`rounded-[20px] overflow-hidden transition-all duration-300 border ${isOpen ? 'border-gray-200 bg-white shadow-sm' : 'border-transparent bg-[#f9fafb] hover:bg-gray-100'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
                >
                  <span
                    className={`text-[17px] font-bold pr-8 ${isOpen ? 'text-[#111827]' : 'text-[#374151]'}`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#111827] text-white' : 'bg-white border border-gray-200 text-[#111827]'}`}
                  >
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 md:px-8 pb-8 text-[#555555] text-[16px] leading-[1.7]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
