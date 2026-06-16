'use client'

import React from 'react'
import { motion } from 'framer-motion'

export default function PartnersSection() {
  return (
    <section className="py-12 bg-white border-y border-gray-100 flex justify-center items-center">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-80 hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
            In Partnership With
          </p>
          <img
            src="/landing/trellissoft.png"
            alt="Trellissoft Partner"
            className="h-12 md:h-16 object-contain"
          />
        </div>
      </div>
    </section>
  )
}
