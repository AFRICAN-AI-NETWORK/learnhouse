'use client'
import { useFormik } from 'formik'
import { useSearchParams } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import PhoneNumberFields from '@components/Objects/StyledElements/Form/PhoneNumberFields'
import * as Form from '@radix-ui/react-form'
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  LucideLoader2,
  LucideLock,
  Mail,
  RefreshCw,
  Tag,
  User,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { signup } from '@services/auth/auth'
import { useOrg } from '@components/Contexts/OrgContext'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_COUNTRY_CODE,
  formatE164,
  validatePhoneFields,
} from '@/lib/phone-number'
import { SiWhatsapp } from '@icons-pack/react-simple-icons'

const whatsappGroupUrl =
  'https://chat.whatsapp.com/BohSUrcVlPREw5KUS2vEPr?mode=gi_t'

const validate = (values: any, t: any) => {
  const errors: any = {}
  const phoneErrors = validatePhoneFields(values)
  if (phoneErrors.country_code) {
    errors.country_code = phoneErrors.country_code
  }
  if (phoneErrors.phone_number) {
    errors.phone_number =
      t('validation.invalid_phone_with_country_code') ||
      phoneErrors.phone_number
  }
  if (!values.email) {
    errors.email = t('validation.required')
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
    errors.email = t('validation.invalid_email')
  }
  if (!values.password) {
    errors.password = t('validation.required')
  } else if (values.password.length < 8) {
    errors.password = t('validation.password_min_length')
  }
  if (!values.username) {
    errors.username = t('validation.required')
  } else if (values.username.length < 4) {
    errors.username = t('validation.username_min_length')
  }
  if (!values.bio) {
    errors.bio = t('validation.required')
  }
  if (!values.first_name) {
    errors.first_name = t('validation.required')
  }
  if (!values.last_name) {
    errors.last_name = t('validation.required')
  }
  return errors
}

const getPasswordStrength = (password: string) => {
  const rules = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  }

  const score = Object.values(rules).filter(Boolean).length

  let strength: 'weak' | 'medium' | 'strong' = 'weak'
  if (score >= 4) strength = 'strong'
  else if (score >= 3) strength = 'medium'

  return { rules, score, strength }
}

function OpenSignUpComponent() {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const org = useOrg() as any
  const searchParams = useSearchParams()
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [referralCode, setReferralCode] = useState('')
  const [referralCodeError, setReferralCodeError] = useState('')

  // Auto-fill referral code from URL (?ref=CODE)
  useEffect(() => {
    const urlCode = searchParams?.get('ref')
    if (urlCode && urlCode !== 'undefined') {
      setReferralCode(urlCode)
      return
    }

    // Fallback: read from localStorage (set by /ref/[code] page)
    try {
      const stored = localStorage.getItem('referral_code')
      if (stored) {
        setReferralCode(stored)
      }
    } catch {
      // localStorage unavailable
    }
  }, [searchParams])

  const formik = useFormik({
    initialValues: {
      org_slug: org?.slug,
      org_id: org?.id,
      email: searchParams.get('email') || '',
      password: '',
      confirmPassword: '',
      username: '',
      bio: '',
      country_code: DEFAULT_COUNTRY_CODE,
      phone_number: '',
      first_name: searchParams.get('first_name') || '',
      last_name: searchParams.get('last_name') || '',
    },
    validate: (values) => validate(values, t),
    enableReinitialize: true,
    onSubmit: async (values) => {
      setError('')
      setReferralCodeError('')
      setMessage('')
      setIsSubmitting(true)

      // ── Device fingerprinting (fail-silent)
      let device_id: string | undefined
      let browser_fingerprint: { visitor_id: string } | undefined
      try {
        const FingerprintJS = await import('@fingerprintjs/fingerprintjs')
        const agent = await FingerprintJS.load()
        const result = await agent.get()
        browser_fingerprint = { visitor_id: result.visitorId }
        device_id = result.visitorId
      } catch {
        /* fingerprint unavailable — proceed without it */
      }

      // Only send required fields, and format phone_number
      const payload: any = {
        org_slug: values.org_slug,
        org_id: values.org_id,
        email: values.email,
        password: values.password,
        username: values.username,
        bio: values.bio,
        phone_number: formatE164(values.country_code, values.phone_number),
        first_name: values.first_name,
        last_name: values.last_name,
        ...(device_id ? { device_id } : {}),
        ...(browser_fingerprint ? { browser_fingerprint } : {}),
        ...(referralCode.trim() ? { referral_code: referralCode.trim() } : {}),
      }
      const res = await signup(payload)
      const response = await res.json()

      if (res.status === 200) {
        // Clear stored referral code after successful signup
        try {
          localStorage.removeItem('referral_code')
        } catch {
          /* ignore */
        }
        setMessage(
          'Account created successfully! Please check your email to verify your account before logging in.'
        )
      } else if (
        res.status === 401 ||
        res.status === 400 ||
        res.status === 404 ||
        res.status === 409
      ) {
        // If error is referral-related, surface inline without blocking signup
        const detail = response.detail
        const errorMessage = Array.isArray(detail)
          ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
          : typeof detail === 'string'
            ? detail
            : detail?.msg ||
              JSON.stringify(detail) ||
              t('common.something_went_wrong')

        if (
          referralCode.trim() &&
          (errorMessage.toLowerCase().includes('referral') ||
            errorMessage.toLowerCase().includes('code'))
        ) {
          setReferralCodeError(
            'Invalid referral code — your account was created without it.'
          )
          // Retry without referral code
          const payloadWithoutRef = {
            org_slug: values.org_slug,
            org_id: values.org_id,
            email: values.email,
            password: values.password,
            username: values.username,
            bio: values.bio,
            phone_number: formatE164(
              values.country_code,
              values.phone_number
            ),
            first_name: values.first_name,
            last_name: values.last_name,
            device_id,
            browser_fingerprint,
          }
          const retryRes = await signup(payloadWithoutRef)
          if (retryRes.status === 200) {
            try {
              localStorage.removeItem('referral_code')
            } catch {
              /* ignore */
            }
            setMessage(
              'Account created successfully! Please check your email to verify your account before logging in.'
            )
          } else {
            const retryRes_json = await retryRes.json()
            const retryDetail = retryRes_json.detail
            const retryErrorMessage = Array.isArray(retryDetail)
              ? retryDetail
                  .map((e: any) => e.msg || JSON.stringify(e))
                  .join(', ')
              : typeof retryDetail === 'string'
                ? retryDetail
                : retryDetail?.msg ||
                  JSON.stringify(retryDetail) ||
                  t('common.something_went_wrong')
            setError(retryErrorMessage)
            // Clear stored referral code after failed signup attempt
            try {
              localStorage.removeItem('referral_code')
            } catch {
              /* ignore */
            }
          }
        } else {
          setError(errorMessage)
          // Clear stored referral code after failed signup attempt
          try {
            localStorage.removeItem('referral_code')
          } catch {
            /* ignore */
          }
        }
      } else {
        setError(t('common.something_went_wrong'))
        // Clear stored referral code after failed signup attempt
        try {
          localStorage.removeItem('referral_code')
        } catch {
          /* ignore */
        }
      }

      setIsSubmitting(false)
    },
  })

  const handleNextStep = async () => {
    const errors = await formik.validateForm()
    // Only check for errors related to current step fields
    if (step === 1) {
      if (!errors.email && !errors.password) {
        setStep(2)
      } else {
        formik.setFieldTouched('email', true)
        formik.setFieldTouched('password', true)
      }
    }
  }

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-6 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Registration Successful
        </h2>
        <p className="text-slate-600 mb-8 max-w-[280px] mx-auto">
          We've sent a verification link to{' '}
          <span className="font-bold text-slate-900">
            {formik.values.email}
          </span>
        </p>

        <div className="mb-6 w-full rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <SiWhatsapp size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  Stay updated on WhatsApp
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  Join the official group for updates and helpful information.
                </p>
              </div>
            </div>

            <a
              href={whatsappGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              <SiWhatsapp size={16} />
              Join Group
            </a>
          </div>
        </div>

        <div className="w-full space-y-3 mb-8">
          <button
            onClick={() => window.open('https://gmail.com', '_blank')}
            className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white font-bold h-12 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
          >
            <Inbox size={20} />
            <span>Open Email Inbox</span>
          </button>

          <button
            onClick={() => {
              /* Logic for resend can be added here */
            }}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-700 font-bold h-12 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={18} />
            <span>Resend Link</span>
          </button>
        </div>

        <div className="pt-6 border-t border-slate-100 w-full">
          <Link
            href={`/login?orgslug=${org?.slug}`}
            className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 1 ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            1
          </div>
          <span
            className={`text-sm font-medium ${step === 1 ? 'text-black' : 'text-slate-400'}`}
          >
            Account
          </span>
        </div>
        <div className="flex-1 h-[2px] mx-4 bg-slate-100 relative">
          <div
            className={`absolute top-0 left-0 h-full bg-black transition-all duration-500 ${step === 2 ? 'w-full' : 'w-0'}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 2 ? 'bg-black text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            2
          </div>
          <span
            className={`text-sm font-medium ${step === 2 ? 'text-black' : 'text-slate-400'}`}
          >
            Profile
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-900 border border-rose-200 shadow-sm animate-in fade-in zoom-in duration-300">
          <AlertTriangle size={18} className="mt-1 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Registration Failed</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      <FormLayout onSubmit={formik.handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <FormField name="email">
              <FormLabelAndMessage label={t('auth.email')} />
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className={`pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all ${formik.errors.email && formik.touched.email ? 'border-red-400 focus:ring-red-500/10' : formik.values.email && !formik.errors.email ? 'border-emerald-500 focus:ring-emerald-500/10' : ''}`}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.email}
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </Form.Control>
              </div>
              {formik.errors.email && formik.touched.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formik.errors.email}
                </p>
              )}
            </FormField>

            <FormField name="password">
              <FormLabelAndMessage label={t('auth.password')} />
              <div className="relative">
                <LucideLock className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className={`pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all ${formik.errors.password && formik.touched.password ? 'border-red-400' : formik.values.password && !formik.errors.password ? 'border-emerald-500 focus:ring-emerald-500/10' : ''}`}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                  />
                </Form.Control>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formik.errors.password && formik.touched.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formik.errors.password}
                </p>
              )}

              {formik.values.password &&
                (() => {
                  const strength = getPasswordStrength(formik.values.password)
                  return (
                    <div className="mt-3 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                              i <= strength.score
                                ? strength.strength === 'strong'
                                  ? 'bg-emerald-500'
                                  : strength.strength === 'medium'
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        8+ characters, uppercase, and numbers required.
                      </p>
                    </div>
                  )
                })()}
            </FormField>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full h-12 flex items-center justify-center gap-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <span>Next Step</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              <FormField name="first_name">
                <FormLabelAndMessage label={t('user.first_name')} />
                <Form.Control asChild>
                  <Input
                    className="h-12 focus:ring-2 focus:ring-black/5 transition-shadow"
                    onChange={formik.handleChange}
                    value={formik.values.first_name}
                    placeholder="First name"
                    type="text"
                    required
                  />
                </Form.Control>
              </FormField>

              <FormField name="last_name">
                <FormLabelAndMessage label={t('user.last_name')} />
                <Form.Control asChild>
                  <Input
                    className="h-12 focus:ring-2 focus:ring-black/5 transition-shadow"
                    onChange={formik.handleChange}
                    value={formik.values.last_name}
                    placeholder="Last name"
                    type="text"
                    required
                  />
                </Form.Control>
              </FormField>
            </div>

            <FormField name="username">
              <FormLabelAndMessage label={t('user.username')} />
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className={`pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-shadow ${formik.errors.username && formik.touched.username ? 'border-red-400' : formik.values.username && !formik.errors.username ? 'border-emerald-500 focus:ring-emerald-500/10' : ''}`}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.username}
                    placeholder="Choose a username"
                    type="text"
                    required
                  />
                </Form.Control>
              </div>
              {formik.errors.username && formik.touched.username && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formik.errors.username}
                </p>
              )}
            </FormField>

            <FormField name="bio">
              <FormLabelAndMessage label={t('user.bio')} />
              <Form.Control asChild>
                <Textarea
                  onChange={formik.handleChange}
                  value={formik.values.bio}
                  required
                />
              </Form.Control>
            </FormField>

            <PhoneNumberFields
              formik={formik}
              phoneNumberLabel={t('user.phone_number') || 'Phone number'}
            />

            {/* Referral Code — optional */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referral Code{' '}
                <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  id="referral_code"
                  name="referral_code"
                  type="text"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value)
                    setReferralCodeError('')
                  }}
                  placeholder="Enter a referral code"
                  autoComplete="off"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                />
              </div>
              {referralCodeError && (
                <p className="mt-1 text-xs text-amber-600 font-medium">
                  {referralCodeError}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-12 flex items-center justify-center gap-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              <Form.Submit asChild>
                <button
                  disabled={isSubmitting}
                  className="flex-2 h-12 flex items-center justify-center gap-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <LucideLoader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UserPlus size={20} />
                  )}
                  <span>
                    {isSubmitting
                      ? t('common.loading')
                      : t('auth.create_account')}
                  </span>
                </button>
              </Form.Submit>
            </div>
          </div>
        )}
      </FormLayout>
    </div>
  )
}

export default OpenSignUpComponent
