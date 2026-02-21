'use client'
import { useFormik } from 'formik'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
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
} from 'lucide-react'
import CourseSelector from '@components/Objects/CourseSelector'
import CountdownTimer from '@components/Utils/CountdownTimer'
import {
  registerWaitlistUser,
  getWaitlistDetails,
} from '@services/waitlist/waitlist'
import { WaitlistConfig } from '@/types/waitlist'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

const validate = (values: any, t: any) => {
  const errors: any = {}

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

interface WaitlistSignUpProps {
  waitlistUuid: string
}

function WaitlistSignUpComponent({ waitlistUuid }: WaitlistSignUpProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgSlug = searchParams.get('orgslug') || ''

  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [waitlistDetails, setWaitlistDetails] = useState<WaitlistConfig | null>(
    null
  )
  const [loadingDetails, setLoadingDetails] = useState(true)

  const launchDate = waitlistDetails?.launch_datetime

  useEffect(() => {
    const fetchWaitlistDetails = async () => {
      try {
        const res = await getWaitlistDetails(waitlistUuid)
        if (res.success && res.data) {
          setWaitlistDetails(res.data)
        }
      } catch (err) {
        toast.error('Failed to fetch waitlist details:')
      } finally {
        setLoadingDetails(false)
      }
    }

    if (waitlistUuid) {
      fetchWaitlistDetails()
    }
  }, [waitlistUuid])

  const handleNextStep = async () => {
    const errors = await formik.validateForm()
    if (step === 1) {
      if (!errors.email && !errors.password) {
        setStep(2)
      } else {
        formik.setFieldTouched('email', true)
        formik.setFieldTouched('password', true)
      }
    } else if (step === 2) {
      const profileErrors = ['username', 'first_name', 'last_name', 'bio']
      const hasProfileError = profileErrors.some((f) => (errors as any)[f])
      if (!hasProfileError) {
        setStep(3)
      } else {
        profileErrors.forEach((f) => formik.setFieldTouched(f, true))
      }
    }
  }

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      bio: '',
      org_slug: orgSlug,
      org_id: waitlistDetails?.org_id || 0,
      is_waitlist: true,
      waitlist_interest: waitlistDetails?.interest_category || '',
    },
    validate: (values) => validate(values, t),
    enableReinitialize: true,
    onSubmit: async (values) => {
      setError('')
      setMessage('')
      setIsSubmitting(true)

      try {
        const payload = {
          ...values,
          selected_course_ids: selectedCourses,
        }

        const res = await registerWaitlistUser(waitlistUuid, payload)

        if (res.ok) {
          setMessage('success')
          setTimeout(() => {
            router.push(
              `/auth/waitlist/countdown?waitlist_uuid=${waitlistUuid}&orgslug=${orgSlug}`
            )
          }, 2000)
        } else {
          const data = await res.json()
          setError(data.detail || 'Registration failed')
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

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

        <p className="text-xs text-slate-500">
          Redirecting to countdown page...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar Container */}
      <div className="w-full max-w-md mx-auto mb-10 px-4">
        <div className="relative flex justify-between">
          <div className="absolute top-[38px] left-0 w-full h-[1px] bg-slate-200" />

          <div
            className="absolute top-[38px] left-0 h-[1px] bg-black transition-all duration-500"
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
              Courses
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
                  className="resize-none focus:ring-2 focus:ring-black/5 transition-all p-3"
                  rows={3}
                  onChange={formik.handleChange}
                  value={formik.values.bio}
                  placeholder="Tell us a bit about yourself..."
                  required
                />
              </Form.Control>
            </FormField>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
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
            <CourseSelector
              waitlistUuid={waitlistUuid}
              selected={selectedCourses}
              onChange={setSelectedCourses}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
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
                    {isSubmitting ? t('common.loading') : 'Join Waitlist 🚀'}
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
