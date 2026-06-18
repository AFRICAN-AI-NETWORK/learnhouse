'use client'
import React, { useState } from 'react'
import { sendContactForm } from '@/services/contact/contact.service'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      if (data.success) {
        setSubmitted(true)
      } else {
        setError(data.message || 'Failed to send email')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-20 dark:bg-[#0f0f13]">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-stone-400 dark:text-white/35">
            African AI Network
          </span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
            Get in Touch
          </h1>
          <p className="mt-3 text-sm text-stone-500 leading-relaxed dark:text-white/55">
            Reach us at{' '}
            <a
              href="mailto:education@africanainetwork.com"
              className="text-stone-700 font-medium underline underline-offset-2 decoration-stone-400 hover:decoration-stone-700 transition-colors dark:text-white/80 dark:decoration-white/25 dark:hover:decoration-white/70"
            >
              education@africanainetwork.com
            </a>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 dark:border-white/8 dark:bg-[#13131a] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xl dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                ✓
              </div>
              <h2 className="text-lg font-semibold text-stone-800 mb-1 dark:text-white/90">
                Message Sent
              </h2>
              <p className="text-sm text-stone-500 dark:text-white/55">
                Thank you for reaching out. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold tracking-wide uppercase text-stone-500 dark:text-white/45"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 transition dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-indigo-400/50 dark:focus:bg-white/7 dark:focus:ring-indigo-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold tracking-wide uppercase text-stone-500 dark:text-white/45"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 transition dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-indigo-400/50 dark:focus:bg-white/7 dark:focus:ring-indigo-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="message"
                  className="block text-xs font-semibold tracking-wide uppercase text-stone-500 dark:text-white/45"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="How can we help you?"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white focus:ring-2 focus:ring-stone-200 transition resize-none dark:border-white/8 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-indigo-400/50 dark:focus:bg-white/7 dark:focus:ring-indigo-500/15"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-700 active:scale-[0.99] text-white text-sm font-semibold tracking-wide rounded-lg transition-all duration-150 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
