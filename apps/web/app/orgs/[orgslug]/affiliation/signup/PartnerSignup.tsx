'use client'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
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
  Inbox,
  LucideLoader2,
  LucideLock,
  Mail,
  User,
  Handshake,
} from 'lucide-react'
import { signup } from '@services/auth/auth'
import { useOrg } from '@components/Contexts/OrgContext'
import { useTranslation } from 'react-i18next'
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
  first_name: Yup.string().required(t('validation.required')),
  last_name: Yup.string().required(t('validation.required')),
  country_code: Yup.string().required(t('validation.required')),
  phone_number: Yup.string()
    .required(t('validation.required'))
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
  org_slug: Yup.string().nullable(),
  org_id: Yup.string().nullable(),
  bio: Yup.string().nullable(),
  signup_type: Yup.string().nullable(),
})

function PartnerSignUpComponent() {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const org = useOrg() as any
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)

  const initialValues = {
    org_slug: org?.slug,
    org_id: org?.id,
    email: searchParams.get('email') || '',
    password: '',
    username: '',
    bio: 'African AI Partner',
    country_code: DEFAULT_COUNTRY_CODE,
    phone_number: '',
    first_name: searchParams.get('first_name') || '',
    last_name: searchParams.get('last_name') || '',
    signup_type: 'partner', // Critical for role assignment
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getValidationSchema(t)) as any,
    defaultValues: initialValues,
  })

  const formValues = watch()

  const onSubmit = async (values: any) => {
    setError('')
    setMessage('')
    setIsSubmitting(true)

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
      signup_type: values.signup_type,
    }

    const res = await signup(payload)
    const response = await res.json()

    if (res.status === 200) {
      setMessage(
        'Partner account created! Please check your email to verify your account.'
      )
      setTimeout(() => {
        router.push(`/login?orgslug=${org?.slug || 'default'}`)
      }, 3000)
    } else {
      const detail = response.detail
      const errorMessage = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
        : typeof detail === 'string'
          ? detail
          : detail?.msg || t('common.something_went_wrong')
      setError(errorMessage)
    }
    setIsSubmitting(false)
  }

  const handleNextStep = async () => {
    const isStep1Valid = await trigger(['email', 'password'])
    if (step === 1 && isStep1Valid) {
      setStep(2)
    }
  }

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="mb-6 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome Aboard!
        </h2>
        <p className="text-slate-600 mb-8 max-w-sm mx-auto">
          Your partner account has been created. Please verify your email{' '}
          <strong>{formValues.email}</strong> to access your dashboard.
        </p>
        <button
          onClick={() => window.open('https://gmail.com', '_blank')}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white font-bold h-12 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
        >
          <Inbox size={20} />
          <span>Open Email Inbox</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            1
          </div>
          <span
            className={`text-sm font-medium ${step === 1 ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Account
          </span>
        </div>
        <div className="flex-1 h-[2px] mx-4 bg-slate-100 relative">
          <div
            className={`absolute top-0 left-0 h-full bg-emerald-600 transition-all duration-500 ${step === 2 ? 'w-full' : 'w-0'}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            2
          </div>
          <span
            className={`text-sm font-medium ${step === 2 ? 'text-slate-900' : 'text-slate-400'}`}
          >
            Details
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-900 border border-rose-200 shadow-sm animate-in fade-in zoom-in duration-300">
          <AlertTriangle size={18} className="mt-1 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Signup Error</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      <FormLayout onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <FormField name="email">
              <FormLabelAndMessage label="Email Address" />
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12"
                    {...register('email')}
                    type="email"
                    placeholder="partner@example.com"
                    required
                  />
                </Form.Control>
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </FormField>

            <FormField name="password">
              <FormLabelAndMessage label="Password" />
              <div className="relative">
                <LucideLock className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12"
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8+ characters"
                    required
                  />
                </Form.Control>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
              )}
            </FormField>

            <button
              type="button"
              onClick={handleNextStep}
              className="w-full h-12 flex items-center justify-center gap-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all mt-4"
            >
              <span>Continue</span>
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="grid grid-cols-2 gap-4">
              <FormField name="first_name">
                <FormLabelAndMessage label="First Name" />
                <Form.Control asChild>
                  <Input
                    className="h-12"
                    {...register('first_name')}
                    required
                  />
                </Form.Control>
                {errors.first_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.first_name.message as string}</p>
                )}
              </FormField>
              <FormField name="last_name">
                <FormLabelAndMessage label="Last Name" />
                <Form.Control asChild>
                  <Input
                    className="h-12"
                    {...register('last_name')}
                    required
                  />
                </Form.Control>
                {errors.last_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.last_name.message as string}</p>
                )}
              </FormField>
            </div>

            <FormField name="username">
              <FormLabelAndMessage label="Username" />
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Form.Control asChild>
                  <Input
                    className="pl-10 h-12"
                    {...register('username')}
                    required
                  />
                </Form.Control>
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username.message as string}</p>
              )}
            </FormField>

            <PhoneNumberFieldsRHF register={register} setValue={setValue} watch={watch} errors={errors} phoneNumberLabel="Phone number" />

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 hover:bg-slate-100 transition-all"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              <Form.Submit asChild>
                <button
                  disabled={isSubmitting}
                  className="flex-2 h-12 flex items-center justify-center gap-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  {isSubmitting ? (
                    <LucideLoader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Handshake size={20} />
                  )}
                  <span>Join Partner Program</span>
                </button>
              </Form.Submit>
            </div>
          </div>
        )}
      </FormLayout>
    </div>
  )
}

export default PartnerSignUpComponent
