'use client'
import Image from 'next/image'
import React from 'react'
import africanAiLogo from 'public/african_ai_horizontal.png'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { resetPassword } from '@services/auth/auth'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

const getValidationSchema = (t: any) => Yup.object().shape({
  email: Yup.string()
    .required(t('validation.required'))
    .email(t('validation.invalid_email')),
  new_password: Yup.string()
    .required(t('validation.required')),
  confirm_password: Yup.string()
    .required(t('validation.required'))
    .oneOf([Yup.ref('new_password')], t('auth.passwords_do_not_match')),
  reset_code: Yup.string()
    .required(t('validation.required')),
})

function ResetPasswordClient() {
  const { t } = useTranslation()
  const org = useOrg() as any
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const searchParams = useSearchParams()
  const reset_code = searchParams.get('resetCode') || ''
  const email = searchParams.get('auth.email') || ''
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(getValidationSchema(t)),
    defaultValues: {
      email: email,
      new_password: '',
      confirm_password: '',
      reset_code: reset_code,
    },
  })

  const onSubmit = async (values: any) => {
    setIsSubmitting(true)
    let res = await resetPassword(
      values.email,
      values.new_password,
      org?.id,
      values.reset_code
    )
    if (res.status == 200) {
      setMessage(res.data + ', ' + t('auth.login_again_message'))
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
  return (
    <div className="grid grid-flow-col justify-stretch h-screen">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      <div
        className="right-login-part"
        style={{
          background:
            'linear-gradient(041.61deg, #202020 7.15%, #000000 90.96%)',
        }}
      >
        <div className="login-topbar m-10">
          <Link prefetch href={getUriWithOrg(org?.slug, '/')}>
            <Image
              quality={100}
              width={30}
              height={30}
              src={africanAiLogo}
              alt=""
            />
          </Link>
        </div>
        <div className="ml-10 h-4/6 flex flex-row text-white">
          <div className="m-auto flex space-x-4 items-center flex-wrap">
            <div className="shadow-[0px_4px_16px_rgba(0,0,0,0.02)]">
              {org?.logo_image ? (
                <img
                  src={`${getOrgLogoMediaDirectory(
                    org?.org_uuid,
                    org?.logo_image
                  )}`}
                  alt="Learnhouse"
                  style={{ width: 'auto', height: 70 }}
                  className="rounded-xl shadow-xl inset-0 ring-1 ring-inset ring-black/10 bg-white"
                />
              ) : (
                <Image
                  quality={100}
                  width={70}
                  height={70}
                  src={africanAiLogo}
                  alt=""
                />
              )}
            </div>
            <div className="font-bold text-xl">{org?.name}</div>
          </div>
        </div>
      </div>
      <div className="left-login-part bg-white flex flex-row">
        <div className="login-form m-auto w-72">
          <h1 className="text-2xl font-bold mb-4">
            {t('auth.reset_password_title')}
          </h1>
          <p className="text-sm mb-4">{t('auth.reset_password_description')}</p>

          {error && (
            <div className="flex justify-center bg-red-200 rounded-md text-red-950 space-x-2 items-center p-4 transition-all shadow-xs">
              <AlertTriangle size={18} />
              <div className="font-bold text-sm">{error}</div>
            </div>
          )}
          {message && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-center bg-green-200 rounded-md text-green-950 space-x-2 items-center p-4 transition-all shadow-xs">
                <Info size={18} />
                <div className="font-bold text-sm">{message}</div>
              </div>
              <Link
                href={getUriWithoutOrg('/login?orgslug=' + org.slug)}
                className="text-center text-sm text-blue-600 hover:text-blue-800"
              >
                {t('auth.login_again_message')}
              </Link>
            </div>
          )}
          <FormLayout onSubmit={handleSubmit(onSubmit)}>
            <FormField name="email">
              <FormLabelAndMessage
                label={t('auth.email')}
                message={errors.email?.message as string}
              />
              <Form.Control asChild>
                <Input
                  {...register('email')}
                  type="email"
                />
              </Form.Control>
            </FormField>

            <FormField name="reset_code">
              <FormLabelAndMessage
                label={t('auth.reset_code')}
                message={errors.reset_code?.message as string}
              />
              <Form.Control asChild>
                <Input
                  {...register('reset_code')}
                  type="text"
                />
              </Form.Control>
            </FormField>

            <FormField name="new_password">
              <FormLabelAndMessage
                label={t('auth.new_password')}
                message={errors.new_password?.message as string}
              />
              <Form.Control asChild>
                <Input
                  {...register('new_password')}
                  type="password"
                  autoComplete="new-password"
                />
              </Form.Control>
            </FormField>

            <FormField name="confirm_password">
              <FormLabelAndMessage
                label={t('auth.confirm_password')}
                message={errors.confirm_password?.message as string}
              />
              <Form.Control asChild>
                <Input
                  {...register('confirm_password')}
                  type="password"
                  autoComplete="new-password"
                />
              </Form.Control>
            </FormField>

            <div className="flex  py-4">
              <Form.Submit asChild>
                <button className="w-full bg-black text-white font-bold text-center p-2 rounded-md shadow-md hover:cursor-pointer">
                  {isSubmitting
                    ? t('common.loading')
                    : t('auth.change_password')}
                </button>
              </Form.Submit>
            </div>
          </FormLayout>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordClient
