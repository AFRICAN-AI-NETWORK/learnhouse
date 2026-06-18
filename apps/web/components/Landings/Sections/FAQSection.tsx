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
    <section
      id="faq"
      className="py-24 px-6 lg:px-12 bg-white border-y border-gray-100"
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#0a0f1e] uppercase">
            Frequently Asked Questions
          </h2>
          <p className="text-[#555555] max-w-2xl mx-auto text-[16px]">
            Everything you need to know about learning with us.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className={`border rounded-2xl overflow-hidden transition-colors duration-200 ${isOpen ? 'border-[#0057ff]/20 bg-[#0057ff]/[0.02]' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0057ff] focus-visible:ring-inset"
                >
                  <span
                    className={`text-[16px] font-bold ${isOpen ? 'text-[#0057ff]' : 'text-[#0a0f1e]'}`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#0057ff] text-white' : 'bg-gray-100 text-[#0a0f1e]'}`}
                  >
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
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
                      <div className="px-6 pb-6 text-[#555555] leading-relaxed">
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
