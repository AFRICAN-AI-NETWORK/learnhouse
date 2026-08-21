import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import NextImage from 'next/image'

export default function ImpactProgramsSection() {
  return (
    <section id="impact" className="bg-white py-24 px-6 text-[#0a0f1e]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 text-[#0057ff] uppercase tracking-widest text-[11px] font-bold mb-6">
          <span className="w-8 h-[2px] bg-[#0057ff]" /> IMPACT PROGRAMS
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight uppercase">
          From Certificate <br />
          <span className="text-[#0057ff]">to Career.</span>
        </h2>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0057ff] rounded-lg text-sm font-bold mb-16 border border-blue-100">
          <span className="w-2 h-2 rounded-full bg-[#0057ff]"></span>
          Available exclusively for Paid Premium Programmes
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Internship Card */}
          <div className="bg-[#f9fafb] border border-gray-100 rounded-[32px] overflow-hidden flex flex-col group shadow-lg hover:shadow-xl transition-shadow relative">
            <div className="h-64 relative overflow-hidden bg-gray-100">
              <NextImage
                src="/landing/internship_office.png"
                alt="Internship Programme"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                width={800}
                height={800}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#f9fafb] to-transparent" />
            </div>

            <div className="p-10 pt-4 flex-1 flex flex-col justify-between z-10 relative">
              <div>
                <h3 className="text-2xl font-bold mb-4">
                  Internship Programme
                </h3>
                <p className="text-[#555555] mb-8 leading-relaxed text-[15px]">
                  Unlock exclusive direct placement pathways connecting top
                  graduates with partner organisations for genuine, hands-on
                  engineering experience on real projects.
                </p>
                <ul className="space-y-4 text-[15px] font-medium text-[#0a0f1e]">
                  <li className="flex gap-3">
                    <span className="text-[#0057ff] font-bold">→</span>
                    <span>Real-world project exposure not shadowing</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#0057ff] font-bold">→</span>
                    <span>Structured career progression pathways</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#0057ff] font-bold">→</span>
                    <span>Mentorship from experienced practitioners</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Laptop Card */}
          <div className="bg-[#f9fafb] border border-gray-100 rounded-[32px] overflow-hidden flex flex-col group shadow-lg hover:shadow-xl transition-shadow relative">
            <div className="h-64 relative overflow-hidden bg-gray-100">
              <NextImage
                src="/landing/laptop_giveaway.png"
                alt="Laptop Giveaway"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                width={800}
                height={800}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#f9fafb] to-transparent" />
            </div>

            <div className="p-10 pt-4 flex-1 flex flex-col justify-between z-10 relative">
              <div>
                <h3 className="text-2xl font-bold mb-4">
                  Laptop Giveaway Initiative
                </h3>
                <p className="text-[#555555] mb-8 leading-relaxed text-[15px]">
                  Excellence is rewarded with the hardware needed to go fully
                  professional in tech. Top performing students become eligible
                  for a free brand-new laptop.
                </p>
              </div>

              <div className="relative z-10 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-auto">
                <h4 className="text-[#0057ff] font-bold text-xs uppercase tracking-wider mb-4">
                  Eligibility Requirements
                </h4>
                <ul className="space-y-3 text-[14px] font-medium text-[#0a0f1e]">
                  <li className="flex gap-3 items-start">
                    <CheckCircle2
                      size={16}
                      className="text-[#0057ff] mt-0.5 shrink-0"
                    />
                    <span>
                      Maintain 100% attendance in all activities of your
                      enrolled premium programme
                    </span>
                  </li>
                  <li className="flex gap-3 items-start">
                    <CheckCircle2
                      size={16}
                      className="text-[#0057ff] mt-0.5 shrink-0"
                    />
                    <span>
                      Achieve a minimum score of 80% and above in all final
                      assessments
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
