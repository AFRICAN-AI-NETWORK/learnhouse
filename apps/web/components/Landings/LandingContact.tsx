import React, { useState, useEffect } from 'react'
import { sendContactForm } from '@/services/contact/contact.service'
import type { ContactForm } from '@/types/contact'
import contactbg from '@/public/landing/contact_bg.png'

export default function ContactSection() {
  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const data = await sendContactForm(form)
      if (data.success) setSubmitted(true)
      else setError(data.message || 'Failed to send message')
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    }
  }

  return (
    <section
      className={`w-full px-0 py-20 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={contactbg.src}
          alt="contact background"
          className="w-full h-full object-cover opacity-[0.05]"
        />
      </div>
      <div className="container mx-auto flex flex-col md:flex-row items-stretch gap-8">
        {/* Left: Info */}
        <div className="flex-1 flex flex-col justify-center px-6 md:px-12 py-10 md:py-0">
          {/* Badge */}
          <div className="flex bg-blue-500/10 border border-blue-500/20 rounded-full py-1.5 px-4 mb-6 w-50">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-blue-500 text-xs font-black uppercase tracking-[0.2em]">
                Get in touch
              </span>
            </span>
          </div>
          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-3">
            Let's{' '}
            <span className="bg-gradient-to-r from-blue-500 to-blue-800 bg-clip-text text-transparent">
              Connect
            </span>
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed mb-8">
            Reach out at{' '}
            <a
              href="mailto:education@africanainetwork.com"
              className="text-blue-500 font-medium border-b border-blue-500/40 hover:text-blue-600 hover:border-blue-600/60 transition-colors duration-200"
            >
              education@africanainetwork.com
            </a>{' '}
            or use the form below.
          </p>
          <div className="w-10 h-0.5 bg-gradient-to-r from-blue-500 to-blue-800 rounded-full mb-8" />
          <p className="text-zinc-400 text-sm md:text-base">
            We value your feedback, questions, and ideas. Fill out the form and
            our team will respond promptly.
          </p>
        </div>
        {/* Right: Form */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative bg-[#18181b] border border-blue-500/20 rounded-3xl p-8 md:p-10 shadow-2xl  w-full max-w-lg overflow-hidden">
            {/* Form Heading */}
            <h3 className="text-2xl font-bold text-white mb-6">Contact Form</h3>
            {/* Success State */}
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
                  <svg
                    className="w-7 h-7 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-white text-xl font-bold mb-2">
                  Message Sent!
                </p>
                <p className="text-blue-300/60 text-sm">
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error banner */}
                {error && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                    <svg
                      className="w-4 h-4 shrink-0 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8v4m0 4h.01"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    {error}
                  </div>
                )}
                {/* Name + Email row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-blue-300/60 text-xs font-medium tracking-widest uppercase">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="bg-white/[0.04] border border-blue-500/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-blue-300/25 outline-none focus:border-blue-400/60 focus:bg-blue-500/[0.07] focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-blue-300/60 text-xs font-medium tracking-widest uppercase">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="bg-white/[0.04] border border-blue-500/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-blue-300/25 outline-none focus:border-blue-400/60 focus:bg-blue-500/[0.07] focus:ring-2 focus:ring-blue-500/10 transition-all duration-200"
                    />
                  </div>
                </div>
                {/* Message */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-blue-300/60 text-xs font-medium tracking-widest uppercase">
                    Message
                  </label>
                  <textarea
                    name="message"
                    placeholder="Tell us what's on your mind..."
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="bg-white/[0.04] border border-blue-500/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-blue-300/25 outline-none focus:border-blue-400/60 focus:bg-blue-500/[0.07] focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 resize-none"
                  />
                </div>
                {/* Submit */}
                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm tracking-wide rounded-xl py-3.5 mt-2 shadow-lg shadow-blue-700/40 hover:shadow-blue-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                >
                  Send Message
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
