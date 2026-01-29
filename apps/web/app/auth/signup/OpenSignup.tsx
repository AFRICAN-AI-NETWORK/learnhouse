'use client'
import Image from 'next/image'
import { useFormik } from 'formik'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  LucideLoader2,
  LucideLock,
  Mail,
  User,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { signup } from '@services/auth/auth'
import { useOrg } from '@components/Contexts/OrgContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'
import africanAiLogo from 'public/african_ai_horizontal.png'

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
  const router = useRouter()
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const formik = useFormik({
    initialValues: {
      org_slug: org?.slug,
      org_id: org?.id,
      email: '',
      password: '',
      confirmPassword: '',
      username: '',
      bio: '',
      first_name: '',
      last_name: '',
    },
    validate: (values) => validate(values, t),
    enableReinitialize: true,
    onSubmit: async (values) => {
      setError('')
      setMessage('')
      setIsSubmitting(true)

      const res = await signup(values)
      const response = await res.json()

      if (res.status === 200) {
        setMessage('Account created successfully! Please check your email to verify your account before logging in.')
        setTimeout(() => {
          const orgSlug = org?.slug || 'default'
          router.push(`/login?orgslug=${orgSlug}`)
        }, 3000)
      } else if (
        res.status === 401 ||
        res.status === 400 ||
        res.status === 404 ||
        res.status === 409
      ) {
        setError(response.detail)
      } else {
        setError(t('common.something_went_wrong'))
      }

      setIsSubmitting(false)
    },
  })

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50">
      <div className="w-full md:w-[450px] max-h-screen py-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <Image
            quality={100}
            width={180}
            src={africanAiLogo}
            alt="African AI Network"
            className="w-auto h-8"
          />
          <LanguageSwitcher />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('auth.create_account')}
            </h1>
            <p className="text-sm text-slate-500">
              Join the African AI Network community today
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-900 border border-rose-200 shadow-sm animate-in fade-in zoom-in duration-300">
              <AlertTriangle size={18} className="mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Registration Failed</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          )}

          {message && (
            <div className="flex flex-col gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900 border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-3">
                <Check size={18} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-bold">{message}</p>
              </div>
              <p className="text-xs opacity-80 leading-relaxed italic border-t border-emerald-200/50 pt-2">
                Check your email inbox (and spam folder) for the verification link.
              </p>
            </div>
          )}

          <FormLayout onSubmit={formik.handleSubmit} className='space-y-4'>
            <FormField name="email">
              <FormLabelAndMessage label={t('auth.email')} />
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className={`pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all ${formik.errors.email ? 'border-red-400 focus:ring-red-500/10' : ''}`}
                    onChange={formik.handleChange}
                    value={formik.values.email}
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </Form.Control>
              </div>
              {formik.errors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">{formik.errors.email}</p>
              )}
            </FormField>

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

            <FormField name="password">
              <FormLabelAndMessage label={t('auth.password')} />
              <div className="relative">
                <LucideLock className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className={`pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-all ${formik.errors.password ? 'border-red-400' : ''}`}
                    onChange={formik.handleChange}
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
              {formik.errors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">{formik.errors.password}</p>
              )}

              {formik.values.password && (() => {
                const strength = getPasswordStrength(formik.values.password)
                return (
                  <div className="mt-3 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= strength.score
                            ? strength.strength === 'strong' ? 'bg-emerald-500' : strength.strength === 'medium' ? 'bg-amber-400' : 'bg-rose-500'
                            : 'bg-slate-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">8+ characters, uppercase, and numbers required.</p>
                  </div>
                )
              })()}
            </FormField>

            <FormField name="username">
              <FormLabelAndMessage label={t('user.username')} />
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12 focus:ring-2 focus:ring-black/5 transition-shadow"
                    onChange={formik.handleChange}
                    value={formik.values.username}
                    placeholder="Choose a username"
                    type="text"
                    required
                  />
                </Form.Control>
              </div>
              {formik.errors.username && (
                <p className="mt-1 text-xs text-red-600 font-medium">{formik.errors.username}</p>
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

            <div className="pt-4">
              <Form.Submit asChild>
                <button
                  disabled={isSubmitting}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-black text-white font-bold rounded-xl shadow-lg shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <LucideLoader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UserPlus size={20} />
                  )}
                  <span>{isSubmitting ? t('common.loading') : t('auth.create_account')}</span>
                </button>
              </Form.Submit>
            </div>
          </FormLayout>

          <p className="text-center text-xs text-slate-500 pt-4">
            {t('auth.already_have_an_account')}{' '}
            <Link
              href={`/login?orgslug=${org?.slug}`}
              className="font-bold text-black hover:underline"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default OpenSignUpComponent
