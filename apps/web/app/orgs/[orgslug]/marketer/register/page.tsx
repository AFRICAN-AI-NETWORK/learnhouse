'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ainaLogo from 'public/aina_logo.png'
import { getUriWithOrg } from '@services/config/config'
import { TrendingUp, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react'
import { registerAsMarketer, MarketerError } from '@services/referral/marketer.service'

const SUPPORTED_COUNTRIES = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
]

export default function MarketerRegisterPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = (params?.orgslug as string) || 'default'

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    country_code: 'NG',
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<MarketerError | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const selectedCountry = SUPPORTED_COUNTRIES.find(
    (c) => c.code === formData.country_code
  )

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Token retrieved from session/localStorage if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

    const res = await registerAsMarketer(token, orgSlug, {
      first_name: formData.first_name,
      last_name: formData.last_name,
      phone_number: formData.phone_number,
      country_code: formData.country_code,
    })

    setIsLoading(false)

    if (res.success) {
      setIsSuccess(true)
    } else if (res.error) {
      setError(res.error)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-sm rounded-xl border border-gray-100 dark:border-gray-800 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Application Submitted!
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Thank you for applying to become a LearnHouse Marketer. Your application is under review by our admin team.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              You will receive an email notification once your application is approved.
            </p>
            <div className="pt-4">
              <button
                onClick={() => router.push(`/orgs/${orgSlug}/marketer`)}
                className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard Status
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Soft Blended Marketing Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-multiply scale-105 transform transition-transform duration-1000"
        style={{ backgroundImage: "url('/marketer-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/95 to-slate-50" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Link href={getUriWithOrg(orgSlug, '/')} className="hover:opacity-80 transition-opacity inline-block">
            <Image
              quality={100}
              width={160}
              height={56}
              src={ainaLogo}
              alt="LearnHouse"
              className="w-auto h-14 mx-auto"
            />
          </Link>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-semibold mb-4 shadow-sm">
          <TrendingUp size={14} className="text-indigo-600" />
          LearnHouse Partner Program
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Become an Official Marketer
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
          Earn <strong className="text-indigo-600 font-semibold">$7.70 USD</strong> for every student you refer who pays for a course, paid directly to your bank or mobile money account.
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-800">
                <span className="font-semibold block mb-0.5">Registration Error</span>
                {error.error_code === 'MKTR_006'
                  ? 'This phone number is already registered to another marketer account.'
                  : error.error_code === 'MKTR_001'
                  ? 'You already have an active or pending marketer account.'
                  : error.message}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jane"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+234 801 234 5678"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Country of Residence
              </label>
              <select
                name="country_code"
                value={formData.country_code}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
              >
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
              {selectedCountry && (
                <p className="mt-1.5 text-xs font-medium text-indigo-600">
                  You will receive your payouts converted to <strong>{selectedCountry.currency}</strong>.
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {isLoading ? 'Submitting Application...' : 'Apply for Marketer Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck size={16} className="text-emerald-600" />
            Instant approval notifications via email.
          </div>
        </div>
      </div>
    </div>
  )
}
