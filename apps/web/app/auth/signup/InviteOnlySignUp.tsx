'use client'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect } from 'react'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import PhoneNumberFieldsRHF from '@components/Objects/StyledElements/Form/PhoneNumberFieldsRHF'
import * as Form from '@radix-ui/react-form'
import { AlertTriangle, Check, User } from 'lucide-react'
import Link from 'next/link'
import { signUpWithInviteCode } from '@services/auth/auth'
import { useOrg } from '@components/Contexts/OrgContext'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_COUNTRY_CODE,
  formatE164,
  validatePhoneFields,
} from '@/lib/phone-number'
import NextImage from 'next/image'

const getValidationSchema = (t: any) =>
  Yup.object().shape({
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
    phone_number: Yup.string().test(
      'is-valid-phone',
      t('validation.invalid_phone') || 'Invalid phone number',
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

interface InviteOnlySignUpProps {
  inviteCode: string
}

function InviteOnlySignUpComponent(props: InviteOnlySignUpProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const org = useOrg() as any
  const router = useRouter()
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const searchParams = useSearchParams()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: formErrors },
  } = useForm({
    resolver: yupResolver(getValidationSchema(t)) as any,
    defaultValues: {
      org_slug: org?.slug,
      org_id: org?.id,
      email: searchParams.get('email') || '',
      password: '',
      username: '',
      bio: '',
      country_code: DEFAULT_COUNTRY_CODE,
      phone_number: '',
      first_name: searchParams.get('first_name') || '',
      last_name: searchParams.get('last_name') || '',
    },
  })

  const onSubmit = async (values: any) => {
    setError('')
    setMessage('')
    setIsSubmitting(true)
    // Only send required fields, and format phone_number
    const payload = {
      org_slug: values.org_slug,
      org_id: values.org_id,
      email: values.email,
      password: values.password,
      username: values.username,
      bio: values.bio,
      phone_number: formatE164(values.country_code, values.phone_number),
      first_name: values.first_name,
      last_name: values.last_name,
    }
    let res = await signUpWithInviteCode(payload, props.inviteCode)
    let message = await res.json()
    if (res.status == 200) {
      setMessage(t('auth.account_created_success'))
      setTimeout(() => {
        const orgSlug = org?.slug || 'default'
        router.push(`/login?orgslug=${orgSlug}`)
      }, 2000)
      setIsSubmitting(false)
    } else if (
      res.status == 401 ||
      res.status == 400 ||
      res.status == 404 ||
      res.status == 409
    ) {
      const detail = message.detail
      const errorMessage = Array.isArray(detail)
        ? detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ')
        : typeof detail === 'string'
          ? detail
          : detail?.msg ||
            JSON.stringify(detail) ||
            t('common.something_went_wrong')
      setError(errorMessage)
      setIsSubmitting(false)
    } else {
      setError(t('common.something_went_wrong'))
      setIsSubmitting(false)
    }
  }

  useEffect(() => {}, [org])

  return (
    <div className="login-form m-auto w-72">
      {error && (
        <div className="flex justify-center bg-red-200 rounded-md text-red-950 space-x-2 items-center p-4 transition-all shadow-xs">
          <AlertTriangle size={18} />
          <div className="font-bold text-sm">{error}</div>
        </div>
      )}
      {message && (
        <div className="flex flex-col space-y-4 justify-center bg-green-200 rounded-md text-green-950 space-x-2 items-center p-4 transition-all shadow-xs">
          <div className="flex space-x-2">
            <Check size={18} />
            <div className="font-bold text-sm">{message}</div>
          </div>
          <hr className="border-green-900/20 800 w-40 border" />
          <Link
            className="flex space-x-2 items-center"
            href={`/login?orgslug=${org?.slug}`}
          >
            <User size={14} /> <div>{t('auth.login_to_your_account')}</div>
          </Link>
        </div>
      )}
      <FormLayout onSubmit={handleSubmit(onSubmit)}>
        <FormField name="email">
          <FormLabelAndMessage
            label={t('auth.email')}
            message={formErrors.email?.message as string}
          />
          <Form.Control asChild>
            <Input {...register('email')} type="email" required />
          </Form.Control>
        </FormField>
        <PhoneNumberFieldsRHF
          register={register}
          setValue={setValue}
          watch={watch}
          errors={formErrors}
          phoneNumberLabel={t('user.phone_number') || 'Phone number'}
        />
        <div className="flex flex-row space-x-2">
          <FormField name="first_name">
            <FormLabelAndMessage
              label={t('user.first_name')}
              message={formErrors.first_name?.message as string}
            />
            <Form.Control asChild>
              <Input {...register('first_name')} type="text" required />
            </Form.Control>
          </FormField>
          <FormField name="last_name">
            <FormLabelAndMessage
              label={t('user.last_name')}
              message={formErrors.last_name?.message as string}
            />
            <Form.Control asChild>
              <Input {...register('last_name')} type="text" required />
            </Form.Control>
          </FormField>
        </div>
        {/* for password  */}
        <FormField name="password">
          <FormLabelAndMessage
            label={t('auth.password')}
            message={formErrors.password?.message as string}
          />

          <Form.Control asChild>
            <Input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              required
            />
          </Form.Control>
        </FormField>
        {/* for username  */}
        <FormField name="username">
          <FormLabelAndMessage
            label={t('user.username')}
            message={formErrors.username?.message as string}
          />

          <Form.Control asChild>
            <Input {...register('username')} type="text" required />
          </Form.Control>
        </FormField>

        {/* for bio  */}
        <FormField name="bio">
          <FormLabelAndMessage
            label={t('user.bio')}
            message={formErrors.bio?.message as string}
          />

          <Form.Control asChild>
            <Textarea {...register('bio')} required />
          </Form.Control>
        </FormField>

        <div className="flex  py-4">
          <Form.Submit asChild>
            <button className="w-full bg-black text-white font-bold text-center p-2 rounded-md shadow-md hover:cursor-pointer">
              {isSubmitting
                ? t('common.loading')
                : t('auth.create_account_and_join')}
            </button>
          </Form.Submit>
        </div>
      </FormLayout>
      {/* <div>
        <div className='flex h-0.5 rounded-2xl bg-slate-100 mt-5 mb-5 mx-10'></div>
        <button onClick={() => signIn('google')} className="flex justify-center py-3 text-md w-full bg-white text-slate-600 space-x-3 font-semibold text-center p-2 rounded-md shadow-sm hover:cursor-pointer">
          <NextImage src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" alt=""  width={800} height={800} />
          <span>{t('auth.sign_in_with_google')}</span>
        </button>
      </div> */}
    </div>
  )
}

export default InviteOnlySignUpComponent
