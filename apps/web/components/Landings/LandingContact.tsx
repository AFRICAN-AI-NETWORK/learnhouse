'use client'

import React, { useState, useEffect } from 'react'
import { sendContactForm } from '@/services/contact/contact.service'
import type { ContactForm } from '@/types/contact'
import { Send, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

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
      className={`relative w-full px-6 lg:px-12 py-24 transition-all duration-700 ease-out bg-white border-y border-gray-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="max-w-7xl mx-auto rounded-[40px] overflow-hidden shadow-2xl flex flex-col lg:flex-row bg-[#0a0f1e]">
        {/* Left: Rich Dark Image/Info Pane */}
        <div className="relative flex-1 p-12 lg:p-16 flex flex-col justify-center min-h-[400px]">
          {/* Background Graphic */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
            style={{ backgroundImage: "url('/landing/contact_bg.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1e] to-transparent" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0057ff]/20 text-[#4da6ff] text-xs font-bold uppercase tracking-widest border border-[#0057ff]/30 backdrop-blur-md mb-6">
              <Sparkles size={14} /> Get in touch
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
              Let's{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0057ff] to-[#4da6ff]">
                Connect
              </span>
            </h2>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-md">
              Reach out to us directly at{' '}
              <a
                href="mailto:education@africanainetwork.com"
                className="text-[#4da6ff] font-semibold hover:text-white transition-all duration-200"
              >
                education@africanainetwork.com
              </a>{' '}
              or drop a message here. We value your feedback and are ready to
              help you take the next step.
            </p>
          </div>
        </div>

        {/* Right: Glassmorphic Form Pane */}
        <div className="flex-1 bg-white/5 backdrop-blur-xl border-l border-white/10 p-8 md:p-16 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />

          <div className="relative z-10 w-full max-w-md mx-auto">
            <h3 className="text-2xl font-bold text-white mb-8">
              Send a Message
            </h3>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-500/30">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white text-2xl font-bold mb-3">
                  Message Sent!
                </p>
                <p className="text-gray-400 text-base">
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-[11px] font-bold tracking-widest uppercase">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[14px] placeholder:text-gray-500 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-gray-300 text-[11px] font-bold tracking-widest uppercase">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[14px] placeholder:text-gray-500 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-gray-300 text-[11px] font-bold tracking-widest uppercase">
                    Message
                  </label>
                  <textarea
                    name="message"
                    placeholder="Tell us what's on your mind..."
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="bg-black/20 border border-white/10 rounded-xl px-4 py-3.5 text-white text-[14px] placeholder:text-gray-500 outline-none focus:border-[#0057ff] focus:ring-1 focus:ring-[#0057ff] transition-all duration-200 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-2.5 bg-[#0057ff] hover:bg-[#0046cc] text-white font-bold text-[14px] rounded-xl py-4 mt-2 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0057ff]"
                >
                  Send Message
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
