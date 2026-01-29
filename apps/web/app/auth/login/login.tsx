'use client'
import africanAiLogo from 'public/african_ai_horizontal.png'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import Image from 'next/image'
import * as Form from '@radix-ui/react-form'
import { useFormik } from 'formik'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import React from 'react'
import { AlertTriangle, UserRoundPlus, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from "next-auth/react"
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

interface LoginClientProps {
  org: any
}

import AuthSplitLayout from '../components/AuthSplitLayout'

const LoginClient = (props: LoginClientProps) => {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showResendButton, setShowResendButton] = React.useState(false)
  const [resendingEmail, setResendingEmail] = React.useState(false)
  const [error, setError] = React.useState('')
  const router = useRouter();

  const validate = (values: any) => {
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

    return errors
  }

  const handleResendVerification = async () => {
    setResendingEmail(true)
    try {
      const response = await fetch('https://lms-backend.africanainetwork.com/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formik.values.email,
          org_slug: props.org.slug || 'default'
        })
      })

      if (response.ok) {
        setError('Verification email sent! Please check your inbox and spam folder.')
        setShowResendButton(false)
      } else {
        setError('Failed to send verification email. Please try again.')
      }
    } catch (err) {
      setError('Error sending verification email. Please try again.')
    } finally {
      setResendingEmail(false)
    }
  }

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validate,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { validateForm, setErrors, setSubmitting }) => {
      setIsSubmitting(true)
      setShowResendButton(false)

      const errors = await validateForm(values);
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        setSubmitting(false);
        setIsSubmitting(false);
        return;
      }

      const res = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        callbackUrl: '/redirect_from_auth'
      });

      if (res && res.error) {
        if (res.error.includes('verify your email') ||
          res.error.includes('email address before') ||
          res.error.includes('Email Not Verified')) {
          setError('Please verify your email address before logging in. Check your inbox for the verification link.')
          setShowResendButton(true)
        } else {
          setError(t('auth.wrong_email_password'));
          setShowResendButton(false)
        }
        setIsSubmitting(false);
      } else {
        await signIn('credentials', {
          email: values.email,
          password: values.password,
          callbackUrl: '/redirect_from_auth'
        });
      }
    },
  })

  return (
    <AuthSplitLayout
      org={props.org}
      title="Login to your Account"
      subtitle="Welcome Back"
    >
      <div className="space-y-6">
        {/* Error/Verification Alerts */}
        {error && (
          <div className={`p-4 rounded-xl transition-all shadow-sm flex flex-col gap-3 ${showResendButton
            ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}>
            <div className="flex items-start gap-3">
              {showResendButton ? <Mail size={18} className="mt-1" /> : <AlertTriangle size={18} className="mt-1" />}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {showResendButton ? 'Email Not Verified' : 'Login Failed'}
                </p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>

            {showResendButton && (
              <div className="pt-3 border-t border-amber-200">
                <p className="text-xs mb-2 italic">
                  Didn't receive the email? Check your spam folder.
                </p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="text-sm font-semibold underline hover:no-underline disabled:opacity-50 flex items-center gap-2"
                >
                  {resendingEmail ? 'Sending...' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        )}

        <FormLayout onSubmit={formik.handleSubmit} className='space-y-4'>
          <FormField name="email">
            <FormLabelAndMessage
              label={t('auth.email')}
              message={formik.errors.email}
            />
            <Form.Control asChild>
              <Input
                className="focus:ring-2 focus:ring-black/5 transition-shadow"
                onChange={formik.handleChange}
                value={formik.values.email}
                type="email"
                placeholder="you@example.com"
              />
            </Form.Control>
          </FormField>

          <FormField name="password">
            <FormLabelAndMessage
              label={t('auth.password')}
              message={formik.errors.password}
            />
            <Form.Control asChild>
              <Input
                className="focus:ring-2 focus:ring-black/5 transition-shadow"
                onChange={formik.handleChange}
                value={formik.values.password}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Form.Control>
          </FormField>

          <div className="flex justify-end">
            <Link
              href={{ pathname: getUriWithoutOrg('/forgot'), query: props.org.slug ? { orgslug: props.org.slug } : null }}
              passHref
              className="text-xs font-semibold text-slate-500 hover:text-black transition-colors"
            >
              {t('auth.forgot_password')}
            </Link>
          </div>

          <div className="pt-2">
            <Form.Submit asChild>
              <button
                disabled={isSubmitting}
                className="w-full bg-black text-white font-bold py-3 rounded-xl shadow-lg shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? t('common.loading') : t('auth.login')}
              </button>
            </Form.Submit>
          </div>
        </FormLayout>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-medium tracking-widest">{t('common.or')}</span>
          </div>
        </div>

        <Link
          href={{ pathname: getUriWithoutOrg('/signup'), query: props.org.slug ? { orgslug: props.org.slug } : null }}
          className="flex justify-center items-center gap-3 w-full py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
        >
          <UserRoundPlus size={18} />
          <span>{t('auth.sign_up')}</span>
        </Link>
      </div>
    </AuthSplitLayout>
  )
}

export default LoginClient
