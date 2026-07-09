'use client'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import PhoneNumberFieldsRHF from '@components/Objects/StyledElements/Form/PhoneNumberFieldsRHF'
import * as Form from '@radix-ui/react-form'
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LucideLoader2,
  LucideLock,
  Mail,
  User,
  UserPlus,
  Tag,
} from 'lucide-react'
import ProductSelector from '@components/Objects/ProductSelector'
import CountdownTimer from '@components/Utils/CountdownTimer'
import {
  registerWaitlistUser,
  getWaitlistDetails,
} from '@services/waitlist/waitlist'
import { WaitlistConfig } from '@/types/waitlist'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  DEFAULT_COUNTRY_CODE,
  formatE164,
  validatePhoneFields,
} from '@/lib/phone-number'

const getValidationSchema = (t: any) => Yup.object().shape({
  email: Yup.string()
    .required(t('validation.required'))
    .email(t('validation.invalid_email')),
  password: Yup.string()
    .required(t('validation.required'))
    .min(8, t('validation.password_min_length')),
  username: Yup.string()
    .required(t('validation.required'))
    .min(4, t('validation.username_min_length')),
  bio: Yup.string().required(t('validation.required')),
  first_name: Yup.string().required(t('validation.required')),
  last_name: Yup.string().required(t('validation.required')),
  country_code: Yup.string().required(t('validation.required')),
  phone_number: Yup.string()
    .test(
      'is-valid-phone',
      t('validation.invalid_phone_with_country_code') || 'Invalid phone number',
      function (value) {
        if (!value) return true
        const { parent } = this
        const phoneErrors = validatePhoneFields({
          country_code: parent.country_code,
          phone_number: value,
        })
        return !(phoneErrors.phone_number || phoneErrors.country_code)
      }
    ),
})

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

interface WaitlistSignUpProps {
  waitlistUuid: string
}

function WaitlistSignUpComponent({ waitlistUuid }: WaitlistSignUpProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgSlug = searchParams.get('orgslug') || ''
  const redirectUrlParam = searchParams.get('redirectUrl') || ''

  const getSafePostSignupRedirect = () => {
    if (!redirectUrlParam || !redirectUrlParam.startsWith('/')) {
      return `/auth/waitlist/countdown?waitlist_uuid=${waitlistUuid}&orgslug=${orgSlug}`
    }
    return redirectUrlParam
  }

  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [waitlistDetails, setWaitlistDetails] = useState<WaitlistConfig | null>(
    null
  )
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [referralCodeError, setReferralCodeError] = useState('')

  const launchDate = waitlistDetails?.launch_datetime

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

  useEffect(() => {
    const fetchWaitlistDetails = async () => {
      try {
        const res = await getWaitlistDetails(waitlistUuid)
        if (res.success && res.data) {
          setWaitlistDetails(res.data)
        }
      } catch {
        toast.error('Failed to fetch waitlist details:')
      } finally {
        setLoadingDetails(false)
      }
    }

    if (waitlistUuid) {
      fetchWaitlistDetails()
    }
  }, [waitlistUuid])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors: formErrors },
  } = useForm({
    resolver: yupResolver(getValidationSchema(t)) as any,
    defaultValues: {
      username: '',
      email: searchParams.get('email') || '',
      password: '',
      first_name: searchParams.get('first_name') || '',
      last_name: searchParams.get('last_name') || '',
      bio: '',
      country_code: DEFAULT_COUNTRY_CODE,
      phone_number: '',
      org_slug: orgSlug,
      org_id: waitlistDetails?.org_id || 0,
      is_waitlist: true,
      waitlist_interest: waitlistDetails?.interest_category || '',
    },
  })

  // To dynamically keep form defaults in sync if waitlistDetails loads later
  useEffect(() => {
    if (waitlistDetails) {
      setValue('org_id', waitlistDetails.org_id)
      setValue('waitlist_interest', waitlistDetails.interest_category || '')
    }
  }, [waitlistDetails, setValue])

  const formValues = watch()

  const onSubmit = async (values: any) => {
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

      try {
        // Only send required fields, and format phone_number
        const payload: any = {
          username: values.username,
          email: values.email,
          password: values.password,
          first_name: values.first_name,
          last_name: values.last_name,
          bio: values.bio,
          phone_number: formatE164(values.country_code, values.phone_number),
          org_slug: values.org_slug,
          org_id: values.org_id,
          is_waitlist: values.is_waitlist,
          waitlist_interest: values.waitlist_interest,
          selected_product_ids: selectedProducts,
          ...(device_id ? { device_id } : {}),
          ...(browser_fingerprint ? { browser_fingerprint } : {}),
          ...(referralCode.trim()
            ? { referral_code: referralCode.trim() }
            : {}),
        }
        const res = await registerWaitlistUser(waitlistUuid, payload)

        if (res.ok) {
          // Clear stored referral code after successful signup
          try {
            localStorage.removeItem('referral_code')
          } catch {
            /* ignore */
          }
          setMessage('success')
          setTimeout(() => {
            router.push(getSafePostSignupRedirect())
          }, 2000)
        } else {
          const data = await res.json()

          // If error is referral-related, surface inline without blocking waitlist signup
          const detail = data.detail
          const errorMessage = Array.isArray(detail)
            ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
            : typeof detail === 'string'
              ? detail
              : detail?.msg || JSON.stringify(detail) || 'Registration failed'

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
              username: values.username,
              email: values.email,
              password: values.password,
              first_name: values.first_name,
              last_name: values.last_name,
              bio: values.bio,
              selected_product_ids: selectedProducts,
              phone_number: formatE164(
                values.country_code,
                values.phone_number
              ),
              org_slug: values.org_slug,
              org_id: values.org_id,
              is_waitlist: values.is_waitlist,
              waitlist_interest: values.waitlist_interest,
              device_id,
              browser_fingerprint,
            }
            const retryRes = await registerWaitlistUser(
              waitlistUuid,
              payloadWithoutRef
            )

            if (retryRes.ok) {
              try {
                localStorage.removeItem('referral_code')
              } catch {
                /* ignore */
              }
              setMessage('success')
              setTimeout(() => {
                router.push(getSafePostSignupRedirect())
              }, 2000)
            } else {
              const retryData = await retryRes.json()
              const retryDetail = retryData.detail
              const retryErrorMessage = Array.isArray(retryDetail)
                ? retryDetail
                    .map((e: any) => e.msg || JSON.stringify(e))
                    .join(', ')
                : typeof retryDetail === 'string'
                  ? retryDetail
                  : retryDetail?.msg ||
                    JSON.stringify(retryDetail) ||
                    'Registration failed'
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
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        // Clear stored referral code after exception during signup
        try {
          localStorage.removeItem('referral_code')
        } catch {
          /* ignore */
        }
      } finally {
        setIsSubmitting(false)
      }
  }

  const handleNextStep = async () => {
    if (step === 1) {
      const isStep1Valid = await trigger(['email', 'password'])
      if (isStep1Valid) {
        setStep(2)
      }
    } else if (step === 2) {
      const isStep2Valid = await trigger([
        'username',
        'first_name',
        'last_name',
        'bio',
        'country_code',
        'phone_number',
      ])
      if (isStep2Valid) {
        setStep(3)
      }
    }
  }

  if (loadingDetails) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin">
          <LucideLoader2 className="w-8 h-8 text-slate-400" />
        </div>
      </div>
    )
  }

  if (message === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-6 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          You've joined the waitlist!
        </h2>
        <p className="text-slate-600 mb-6 max-w-[360px] mx-auto">
          Check your email to verify your account. You'll be able to login on{' '}
          {launchDate
            ? new Date(launchDate).toLocaleDateString()
            : 'the launch date'}{' '}
          .
        </p>

        <div className="mb-6">
          <CountdownTimer launchDate={launchDate} />
        </div>

        <p className="text-xs text-slate-500">Redirecting you now...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar Container */}
      <div className="w-full max-w-md mx-auto mb-10 px-4">
        <div className="relative flex justify-between">
          <div className="absolute top-[38px] left-0 w-full h-px bg-slate-200" />

          <div
            className="absolute top-[38px] left-0 h-px bg-black transition-all duration-500"
            style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`text-[10px] font-bold uppercase mb-3 transition-colors duration-300 ${step === 1 ? 'text-black' : 'text-slate-300'}`}
            >
              Account
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${step >= 1 ? 'bg-black text-white border-black' : 'bg-white text-slate-300 border-slate-100'}`}
            >
              1
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`text-[10px] font-bold uppercase mb-3 transition-colors duration-300 ${step === 2 ? 'text-black' : 'text-slate-300'}`}
            >
              Profile
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${step >= 2 ? 'bg-black text-white border-black' : 'bg-white text-slate-300 border-slate-100'}`}
            >
              2
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <span
              className={`text-[10px] font-bold uppercase mb-3 transition-colors duration-300 ${step === 3 ? 'text-black' : 'text-slate-300'}`}
            >
              Packages
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${step >= 3 ? 'bg-black text-white border-black' : 'bg-white text-slate-300 border-slate-100'}`}
            >
              3
            </div>
          </div>
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

      <FormLayout onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <FormField name="email">
              <FormLabelAndMessage label={t('auth.email')} />
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all"
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </Form.Control>
              </div>
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formErrors.email.message as string}
                </p>
              )}
            </FormField>

            <FormField name="password">
              <FormLabelAndMessage label={t('auth.password')} />
              <div className="relative">
                <LucideLock className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all"
                    {...register('password')}
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
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formErrors.password.message as string}
                </p>
              )}

              {formValues.password &&
                (() => {
                  const strength = getPasswordStrength(formValues.password)
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
                    {...register('first_name')}
                    placeholder="First name"
                    type="text"
                    required
                  />
                </Form.Control>
                {formErrors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.first_name.message as string}</p>
                )}
              </FormField>

              <FormField name="last_name">
                <FormLabelAndMessage label={t('user.last_name')} />
                <Form.Control asChild>
                  <Input
                    className="h-12 focus:ring-2 focus:ring-black/5 transition-shadow"
                    {...register('last_name')}
                    placeholder="Last name"
                    type="text"
                    required
                  />
                </Form.Control>
                {formErrors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.last_name.message as string}</p>
                )}
              </FormField>
            </div>

            <FormField name="username">
              <FormLabelAndMessage label={t('user.username')} />
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-shadow"
                    {...register('username')}
                    placeholder="Choose a username"
                    type="text"
                    required
                  />
                </Form.Control>
              </div>
              {formErrors.username && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {formErrors.username.message as string}
                </p>
              )}
            </FormField>

            <PhoneNumberFieldsRHF
              register={register}
              setValue={setValue}
              watch={watch}
              errors={formErrors}
              phoneNumberLabel={t('user.phone_number') || 'Phone number'}
            />

            <FormField name="bio">
              <FormLabelAndMessage label={t('user.bio')} />
              <Form.Control asChild>
                <Textarea
                  className="resize-none focus:ring-2 focus:ring-black/5 transition-all p-3"
                  rows={3}
                  {...register('bio')}
                  placeholder="Tell us a bit about yourself..."
                  required
                />
              </Form.Control>
              {formErrors.bio && (
                <p className="text-red-500 text-sm mt-1">{formErrors.bio.message as string}</p>
              )}
            </FormField>

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

            <div className="flex sm:flex-row gap-3 pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-12 flex items-center justify-center gap-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="flex-2 h-12 flex items-center justify-center gap-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <span>Next Step</span>
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <ProductSelector
              orgId={waitlistDetails?.org_id || 0}
              selected={selectedProducts}
              onChange={setSelectedProducts}
            />

            <div className="flex  sm:flex-row gap-3 pt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
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
                    {isSubmitting ? t('common.loading') : 'Join Waitlist'}
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

export default WaitlistSignUpComponent
