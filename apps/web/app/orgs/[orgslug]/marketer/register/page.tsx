'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
    <div className="relative min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Blended Marketing Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105 transform transition-transform duration-1000"
        style={{ backgroundImage: "url('/marketer-bg.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/90 to-slate-950" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold mb-4 backdrop-blur-md">
          <TrendingUp size={14} className="text-indigo-400" />
          LearnHouse Partner Program
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Become an Official Marketer
        </h1>
        <p className="mt-2 text-sm text-gray-300 max-w-sm mx-auto leading-relaxed">
          Earn <strong className="text-indigo-400 font-semibold">$7.70 USD</strong> for every student you refer who pays for a course, paid directly to your bank or mobile money account.
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-slate-800/80">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300">
                <span className="font-semibold block">Registration Error</span>
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
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Jane"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                required
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+234 801 234 5678"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country of Residence
              </label>
              <select
                name="country_code"
                value={formData.country_code}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
              >
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
              {selectedCountry && (
                <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                  You will receive your payouts converted to <strong>{selectedCountry.currency}</strong>.
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Submitting Application...' : 'Apply for Marketer Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck size={16} className="text-emerald-500" />
            Instant approval notifications via email.
          </div>
        </div>
      </div>
    </div>
  )
}
