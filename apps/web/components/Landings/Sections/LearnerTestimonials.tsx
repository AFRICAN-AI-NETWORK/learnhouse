import { Star } from 'lucide-react'
import { testimonials } from '@/data/testimonials'

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-[#E3A857] text-[#E3A857]' : 'text-[#8B8578]/25'
          }`}
        />
      ))}
    </div>
  )
}

export default function LearnerTestimonials() {
  return (
    <section className="relative overflow-hidden bg-[#f9fafb] py-24 px-6 text-[#0a0f1e]">
      <div className="relative mx-auto max-w-6xl">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0057ff]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#0057ff]">
            Learner Stories
          </span>
          <h2 className="mt-4 text-3xl font-bold uppercase text-[#0a0f1e] md:text-5xl">
            Before AI. <span className="text-[#0057ff]">After AAN.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[#555555]">
            Real shifts from learners who came in unsure of what AI even meant,
            and left building with it every day.
          </p>
        </div>

        {/* Cards */}
        <ul className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="group relative flex flex-col rounded-[28px] border border-gray-100 bg-white p-8 shadow-lg shadow-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-[#0057ff]/20 hover:shadow-xl"
            >
              {/* decorative quote mark */}
              <span
                aria-hidden
                className="pointer-events-none absolute right-6 top-4 select-none text-6xl font-black leading-none text-[#0057ff]/10"
              >
                “
              </span>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[16px] font-bold text-[#0a0f1e]">
                    {t.name}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-[#0057ff]">
                    {t.course}
                  </p>
                </div>
                <Stars rating={t.rating} />
              </div>

              <div className="relative mt-6 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
                  The Challenge
                </p>
                <p className="text-[14px] leading-relaxed text-[#555555]">
                  {t.challenge}
                </p>
              </div>

              {/* transformation divider */}
              <div className="my-5 flex items-center gap-2" aria-hidden>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0057ff]/30 to-transparent" />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0057ff"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#0057ff]/30 to-transparent" />
              </div>

              <div className="relative space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0057ff]">
                  The Shift
                </p>
                <p className="text-[15px] font-medium leading-relaxed text-[#0a0f1e]">
                  {t.testimonial}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
