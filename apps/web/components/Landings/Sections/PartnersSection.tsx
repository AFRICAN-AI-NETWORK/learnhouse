'use client'

import React from 'react'
import NextImage from 'next/image'

const partners = [
  {
    src: '/landing/trellissoft.png',
    alt: 'Trellissoft Partner',
  },
  {
    src: '/landing/calabar.png',
    alt: 'University of calabar',
  },
]

export default function PartnersSection() {
  return (
    <section className="py-12 bg-white border-y border-gray-100 flex justify-center items-center">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-80 hover:opacity-100 transition-opacity duration-300">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
            In Partnership With
          </p>
          {partners.map((partner) => (
            <NextImage
              key={partner.src}
              src={partner.src}
              alt={partner.alt}
              className="h-12 md:h-18 object-contain"
              width={800}
              height={800}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
