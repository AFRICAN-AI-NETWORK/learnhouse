'use client'
import africanAiLogo from 'public/african_ai_horizontal.png'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
} from '@components/Objects/StyledElements/Form/Form'
import Image from 'next/image'
import * as Form from '@radix-ui/react-form'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import React from 'react'
import {
  AlertTriangle,
  UserRoundPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LucideLoader2,
} from 'lucide-react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

interface LoginClientProps {
  org: any
}

const LoginClient = (props: LoginClientProps) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showResendButton, setShowResendButton] = React.useState(false)
  const [resendingEmail, setResendingEmail] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState('')
  const router = require('next/navigation').useRouter()

  const validationSchema = React.useMemo(
    () =>
      Yup.object().shape({
        email: Yup.string()
          .required(t('validation.required'))
          .email(t('validation.invalid_email')),
        password: Yup.string()
          .required(t('validation.required'))
          .min(8, t('validation.password_min_length')),
      }),
    [t]
  )

  const handleResendVerification = async () => {
    setResendingEmail(true)
    try {
      const response = await fetch(
        'https://lms-backend.africanainetwork.com/api/v1/auth/resend-verification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: getValues('email'),
            org_slug: props.org.slug || 'default',
          }),
        }
      )

      if (response.ok) {
        setError(t('auth.verification_sent'))
        setShowResendButton(false)
      } else {
        setError(t('auth.verification_failed'))
      }
    } catch {
      setError(t('auth.verification_error'))
    } finally {
      setResendingEmail(false)
    }
  }

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, touchedFields },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  })

  const onSubmit = async (values: any) => {
    setIsSubmitting(true)
    setShowResendButton(false)

    const res = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl: '/redirect_from_auth',
    })

    if (res && res.error) {
      if (
        res.error.includes('verify your email') ||
        res.error.includes('email address before') ||
        res.error.includes('Email Not Verified')
      ) {
        setError(t('auth.verify_prompt'))
        setShowResendButton(true)
      } else {
        setError(t('auth.wrong_email_password'))
        setShowResendButton(false)
      }
      setIsSubmitting(false)
    } else {
      await signIn('credentials', {
        email: values.email,
        password: values.password,
        callbackUrl: '/redirect_from_auth',
      })
    }
  }

  const getBorderColor = (fieldName: 'email' | 'password') => {
    const isTouched = touchedFields[fieldName]
    const error = errors[fieldName]
    if (!isTouched && !error) return 'border-slate-200 focus:border-black'
    return error
      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/10'
      : 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/10'
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50 p-6">
      <div className="w-full max-w-[450px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center mb-8">
          <Link href={getUriWithOrg(props.org?.slug, '/')}>
            <Image
              quality={100}
              width={160}
              height={56}
              src={
                getOrgLogoMediaDirectory(
                  props.org?.org_uuid,
                  props.org?.logo_image
                ) || africanAiLogo
              }
              alt={props.org?.name || 'African AI Network'}
              className="w-auto h-14 hover:opacity-80 transition-opacity"
            />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('auth.login')}
            </h1>
            <p className="text-sm text-slate-500 italic">
              {t('auth.welcome_back')}
            </p>
          </div>

          {error && (
            <div
              className={`p-4 rounded-2xl transition-all shadow-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300 ${
                showResendButton
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {showResendButton ? (
                  <Mail size={18} className="mt-1" />
                ) : (
                  <AlertTriangle size={18} className="mt-1" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {showResendButton
                      ? t('auth.email_not_verified')
                      : t('auth.login_failed')}
                  </p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>

              {showResendButton && (
                <div className="pt-3 border-t border-amber-200">
                  <p className="text-xs mb-2 italic">
                    {t('auth.didnt_receive_email')}
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="text-sm font-semibold underline hover:no-underline disabled:opacity-50 flex items-center gap-2"
                  >
                    {resendingEmail
                      ? t('common.sending')
                      : t('auth.resend_verification')}
                  </button>
                </div>
              )}
            </div>
          )}

          <FormLayout onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="email">
              <FormLabelAndMessage
                label={t('auth.email')}
                message={errors.email?.message as string}
              />
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors"
                  size={18}
                />
                <Form.Control asChild>
                  <input
                    className={`w-full h-12 pl-12 pr-4 bg-white border rounded-xl transition-all outline-none font-medium text-slate-900 ${getBorderColor('email')}`}
                    {...register('email')}
                    type="email"
                    placeholder={t('auth.email_placeholder')}
                  />
                </Form.Control>
              </div>
            </FormField>

            <FormField name="password">
              <div className="flex justify-between items-center mb-2">
                <FormLabelAndMessage
                  label={t('auth.password')}
                  message={errors.password?.message as string}
                />
                <Link
                  href={{
                    pathname: getUriWithoutOrg('/forgot'),
                    query: props.org.slug ? { orgslug: props.org.slug } : null,
                  }}
                  passHref
                  className="text-xs font-semibold text-slate-500 hover:text-black transition-colors"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors"
                  size={18}
                />
                <Form.Control asChild>
                  <input
                    className={`w-full h-12 pl-12 pr-12 bg-white border rounded-xl transition-all outline-none font-medium text-slate-900 ${getBorderColor('password')}`}
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t('auth.password_placeholder')}
                  />
                </Form.Control>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
                    <UserRoundPlus size={18} />
                  )}
                  <span>
                    {isSubmitting ? t('common.loading') : t('auth.login')}
                  </span>
                </button>
              </Form.Submit>
            </div>
          </FormLayout>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-medium tracking-widest">
                {t('common.or')}
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-600">
            {t('auth.no_account')}{' '}
            <Link
              href={getUriWithOrg(props.org?.slug, '/#programs')}
              className="font-bold text-black hover:underline underline-offset-4"
            >
              Apply Now
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginClient
