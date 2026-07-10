'use client'
import Image from 'next/image'
import React from 'react'
import africanAiLogo from 'public/african_ai_horizontal.png'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LucideLoader2,
  Mail,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { sendResetLink } from '@services/auth/auth'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

const getValidationSchema = (t: any) =>
  Yup.object().shape({
    email: Yup.string()
      .required(t('validation.required'))
      .email(t('validation.invalid_email')),
  })

function ForgotPasswordClient() {
  const { t } = useTranslation()
  const org = useOrg() as any
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getValidationSchema(t)),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: any) => {
    setError('')
    setMessage('')
    setIsSubmitting(true)
    let res = await sendResetLink(values.email, org?.id)
    if (res.status == 200) {
      setMessage(res.data + ', ' + t('auth.check_email_message'))
      setIsSubmitting(false)
    } else {
      const detail = res.data.detail
      const errorMessage = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
        : typeof detail === 'string'
          ? detail
          : detail?.msg ||
            JSON.stringify(detail) ||
            t('common.something_went_wrong')
      setError(errorMessage)
      setIsSubmitting(false)
    }
  }

  const emailHasError = Boolean(errors.email)
  // eslint-disable-next-line react-compiler/react-compiler
  const emailIsValid = Boolean(watch('email') && !errors.email)

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-slate-50/50">
      <div className="w-full px-6 py-12 md:w-[500px]">
        <div className="mb-8 flex items-center justify-between">
          <Link prefetch href={getUriWithOrg(org?.slug, '/')}>
            <Image
              quality={100}
              width={160}
              src={africanAiLogo}
              alt="African AI Network"
              className="h-8 w-auto transition-opacity hover:opacity-80"
            />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="space-y-8 rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60 md:p-10">
          {message ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in zoom-in duration-500">
              <div className="mb-6 rounded-full bg-emerald-100 p-4 ring-8 ring-emerald-50">
                <CheckCircle2 size={48} className="text-emerald-600" />
              </div>

              <h2 className="mb-2 text-2xl font-bold text-slate-900">
                Check your email
              </h2>
              <p className="mx-auto mb-8 max-w-[300px] text-sm leading-6 text-slate-600">
                {message}
              </p>

              <Link
                href={{
                  pathname: getUriWithoutOrg('/login'),
                  query: org?.slug ? { orgslug: org.slug } : null,
                }}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-black font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                <ArrowLeft size={18} />
                <span>Back to Login</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {t('auth.forgot_password_title')}
                </h1>
                <p className="text-sm italic leading-6 text-slate-500">
                  {t('auth.forgot_password_description')}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm animate-in fade-in zoom-in duration-300">
                  <AlertTriangle size={18} className="mt-1 shrink-0" />
                  <div className="text-sm">
                    <p className="font-bold">Reset Link Failed</p>
                    <p className="opacity-90">{error}</p>
                  </div>
                </div>
              )}

              <FormLayout
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField name="email">
                  <FormLabelAndMessage label={t('auth.email')} />
                  <div className="group relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-black"
                      size={18}
                    />
                    <Form.Control asChild>
                      <input
                        className={`h-12 w-full rounded-xl border bg-white pl-12 pr-4 font-medium text-slate-900 outline-none transition-all ${
                          emailHasError
                            ? 'border-red-400 focus:ring-2 focus:ring-red-500/10'
                            : emailIsValid
                              ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                              : 'border-slate-200 focus:border-black focus:ring-4 focus:ring-black/5'
                        }`}
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </Form.Control>
                  </div>
                  {emailHasError && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {errors.email?.message as string}
                    </p>
                  )}
                </FormField>

                <div className="pt-4">
                  <Form.Submit asChild>
                    <button
                      disabled={isSubmitting}
                      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-black font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-slate-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <LucideLoader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      <span>
                        {isSubmitting
                          ? t('common.loading')
                          : t('auth.send_reset_link')}
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
                  <span className="bg-white px-3 font-medium tracking-widest text-slate-400">
                    {t('common.or')}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm text-slate-600">
                <Link
                  href={{
                    pathname: getUriWithoutOrg('/login'),
                    query: org?.slug ? { orgslug: org.slug } : null,
                  }}
                  className="font-bold text-black underline-offset-4 hover:underline"
                >
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordClient
