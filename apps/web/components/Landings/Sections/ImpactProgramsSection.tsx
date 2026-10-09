import React from 'react'
import { CheckCircle2, Award, Laptop } from 'lucide-react'
import NextImage from 'next/image'

export default function ImpactProgramsSection() {
  return (
    <section
      id="impact"
      className="relative bg-white py-32 px-6 border-t border-gray-100 overflow-hidden"
    >
      {/* Premium Background Blurs */}
      <div className="absolute top-40 left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-40 right-[-10%] w-[500px] h-[500px] bg-green-50/50 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0f5ff] text-[#0057ff] text-[13px] font-bold tracking-wide">
              <Award size={14} className="text-[#0057ff]" /> Impact Programs
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-[#111827] tracking-tight leading-[1.1]">
              From certificate <br />
              to career.
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-3 bg-white text-[#555555] rounded-xl text-[14px] font-medium border border-gray-200 shadow-sm self-start md:self-end">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0057ff] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0057ff]"></span>
            </span>
            Available for all Paid Programs (Excluding AAN Open)
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {/* Internship Card (Horizontal) */}
          <div className="bg-white border border-gray-100 rounded-[40px] flex flex-col lg:flex-row group shadow-[0_8px_40px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.08)] transition-all duration-500 overflow-hidden p-3">
            <div className="lg:w-[45%] h-[300px] lg:h-auto relative overflow-hidden bg-gray-100 rounded-[32px]">
              <NextImage
                src="/landing/internship_office.png"
                alt="Internship Programme"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                width={800}
                height={800}
              />
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#e2f5ee] flex items-center justify-center text-[#16a34a] font-black text-xl">
                    1
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-gray-500 uppercase">
                      Step
                    </p>
                    <p className="text-[15px] font-bold text-[#111827]">
                      Get Hired
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center">
              <h3 className="text-3xl lg:text-4xl font-bold text-[#111827] mb-6 leading-tight">
                Guaranteed Internship & <br />
                Direct Placement
              </h3>
              <p className="text-[#555555] mb-10 leading-[1.8] text-[17px] max-w-xl">
                Unlock exclusive direct placement pathways connecting top
                graduates with partner organisations for genuine, hands-on
                engineering experience on real projects.
              </p>

              <ul className="space-y-5 text-[16px] font-medium text-[#111827]">
                <li className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0 text-[#0057ff]">
                    <CheckCircle2 size={16} />
                  </div>
                  <span>Real-world project exposure (not just shadowing)</span>
                </li>
                <li className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0 text-[#0057ff]">
                    <CheckCircle2 size={16} />
                  </div>
                  <span>Structured career progression pathways</span>
                </li>
                <li className="flex gap-4 items-center">
                  <div className="w-8 h-8 rounded-full bg-[#f0f5ff] flex items-center justify-center shrink-0 text-[#0057ff]">
                    <CheckCircle2 size={16} />
                  </div>
                  <span>Mentorship from experienced practitioners</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Laptop Card (Horizontal, Reversed) */}
          <div className="bg-[#111827] border border-gray-800 rounded-[40px] flex flex-col lg:flex-row-reverse group shadow-[0_8px_40px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgb(0,0,0,0.12)] transition-all duration-500 overflow-hidden p-3">
            <div className="lg:w-[45%] h-[300px] lg:h-auto relative overflow-hidden bg-gray-900 rounded-[32px]">
              <NextImage
                src="/landing/laptop_giveaway.png"
                alt="Laptop Giveaway"
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 ease-out"
                width={800}
                height={800}
              />
              <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-black">
                    <Laptop size={20} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-gray-400 uppercase">
                      Hardware
                    </p>
                    <p className="text-[15px] font-bold text-white">Provided</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-[55%] p-10 lg:p-16 flex flex-col justify-center">
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-6 leading-tight">
                Laptop Giveaway <br />
                Initiative
              </h3>
              <p className="text-gray-400 mb-10 leading-[1.8] text-[17px] max-w-xl">
                Excellence is rewarded with the hardware needed to go fully
                professional in tech. Top performing students become eligible
                for a free brand-new laptop.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-[24px] p-8 mt-auto backdrop-blur-sm">
                <h4 className="text-white font-bold text-[15px] mb-6 flex items-center gap-2">
                  Eligibility Requirements
                </h4>
                <ul className="space-y-4 text-[15px] font-medium text-gray-300">
                  <li className="flex gap-4 items-start">
                    <CheckCircle2
                      size={18}
                      className="text-yellow-500 mt-0.5 shrink-0"
                    />
                    <span>
                      Maintain 100% attendance in all activities of your
                      enrolled premium programme
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <CheckCircle2
                      size={18}
                      className="text-yellow-500 mt-0.5 shrink-0"
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
