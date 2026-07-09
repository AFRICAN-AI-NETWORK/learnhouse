'use client'
import React from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { updateOrganization } from '@services/settings/org'
import { revalidateTags } from '@services/utils/ts/requests'
import { useRouter } from 'next/navigation'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { toast } from 'react-hot-toast'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { useTranslation } from 'react-i18next'

const ORG_LABELS = [
  { value: 'languages', label: '🌐 Languages' },
  { value: 'business', label: '💰 Business' },
  { value: 'ecommerce', label: '🛍 E-commerce' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎸 Music' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'cars', label: '🚗 Cars' },
  { value: 'sales_marketing', label: '🚀 Sales & Marketing' },
  { value: 'tech', label: '💻 Tech' },
  { value: 'photo_video', label: '📸 Photo & Video' },
  { value: 'pets', label: '🐕 Pets' },
  { value: 'personal_development', label: '📚 Personal Development' },
  { value: 'real_estate', label: '🏠 Real Estate' },
  { value: 'beauty_fashion', label: '👠 Beauty & Fashion' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'productivity', label: '⏳ Productivity' },
  { value: 'health_fitness', label: '🍎 Health & Fitness' },
  { value: 'finance', label: '📈 Finance' },
  { value: 'arts_crafts', label: '🎨 Arts & Crafts' },
  { value: 'education', label: '📚 Education' },
  { value: 'stem', label: '🔬 STEM' },
  { value: 'humanities', label: '📖 Humanities' },
  { value: 'professional_skills', label: '💼 Professional Skills' },
  { value: 'digital_skills', label: '💻 Digital Skills' },
  { value: 'creative_arts', label: '🎨 Creative Arts' },
  { value: 'social_sciences', label: '🌍 Social Sciences' },
  { value: 'test_prep', label: '✍️ Test Preparation' },
  { value: 'vocational', label: '🔧 Vocational Training' },
  { value: 'early_education', label: '🎯 Early Education' },
] as const

interface OrganizationValues {
  name: string
  description: string
  about: string
  label: string
}

const OrgEditGeneral: React.FC = () => {
  const { t } = useTranslation()

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required(t('dashboard.organization.settings.validation.name_required'))
      .max(60, t('dashboard.organization.settings.validation.name_max')),
    description: Yup.string()
      .required(
        t('dashboard.organization.settings.validation.description_required')
      )
      .max(
        100,
        t('dashboard.organization.settings.validation.description_max')
      ),
    about: Yup.string()
      .optional()
      .max(400, t('dashboard.organization.settings.validation.about_max')),
    label: Yup.string().required(
      t('dashboard.organization.settings.validation.label_required')
    ),
  })
  const router = useRouter()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const org = useOrg() as any

  const initialValues: OrganizationValues = {
    name: org?.name,
    description: org?.description || '',
    about: org?.about || '',
    label: org?.label || '',
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationValues>({
    resolver: yupResolver(validationSchema) as any,
    defaultValues: initialValues,
  })

  React.useEffect(() => {
    reset(initialValues)
  }, [org?.name, org?.description, org?.about, org?.label, reset])

  const formValues = watch()

  const updateOrg = async (values: OrganizationValues) => {
    const loadingToast = toast.loading(
      t('dashboard.organization.settings.updating')
    )
    try {
      await updateOrganization(org.id, values, access_token)
      await revalidateTags(['organizations'], org.slug)
      mutate(`${getAPIUrl()}orgs/slug/${org.slug}`)
      toast.success(t('dashboard.organization.settings.update_success'), {
        id: loadingToast,
      })
    } catch (err) {
      toast.error(t('dashboard.organization.settings.update_error'), {
        id: loadingToast,
      })
    }
  }

  const onSubmit = async (values: OrganizationValues) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await updateOrg(values)
  }

  return (
    <div className="sm:mx-10 mx-0 bg-white rounded-xl nice-shadow dark:border dark:border-white/8 dark:bg-[#13131a]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-0">
              <div className="flex flex-col bg-gray-50 -space-y-1 px-5 py-3 mx-3 my-3 rounded-md dark:bg-white/5">
                <h1 className="font-bold text-xl text-gray-800 dark:text-white/90">
                  {t('dashboard.organization.settings.title')}
                </h1>
                <h2 className="text-gray-500 text-md dark:text-white/50">
                  {t('dashboard.organization.settings.subtitle')}
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row lg:space-x-8 mt-0 mx-5 my-5">
                <div className="w-full space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">
                        {t('dashboard.organization.settings.name')}
                        <span className="text-gray-500 text-sm ml-2 dark:text-white/40">
                          ({60 - (formValues.name?.length || 0)} characters left)
                        </span>
                      </Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder={t(
                          'dashboard.organization.settings.name_placeholder'
                        )}
                        maxLength={60}
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.name.message as string}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description">
                        {t('dashboard.organization.settings.short_description')}
                        <span className="text-gray-500 text-sm ml-2 dark:text-white/40">
                          ({100 - (formValues.description?.length || 0)} characters
                          left)
                        </span>
                      </Label>
                      <Input
                        id="description"
                        {...register('description')}
                        placeholder={t(
                          'dashboard.organization.settings.short_description_placeholder'
                        )}
                        maxLength={100}
                      />
                      {errors.description && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.description.message as string}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="label">
                        {t('dashboard.organization.settings.label')}
                      </Label>
                      <Select
                        value={formValues.label}
                        onValueChange={(value) => setValue('label', value)}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              'dashboard.organization.settings.label_placeholder'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {ORG_LABELS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.label && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.label.message as string}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="about">
                        {t('dashboard.organization.settings.about')}
                        <span className="text-gray-500 text-sm ml-2 dark:text-white/40">
                          ({400 - (formValues.about?.length || 0)} characters left)
                        </span>
                      </Label>
                      <Textarea
                        id="about"
                        {...register('about')}
                        placeholder={t(
                          'dashboard.organization.settings.about_placeholder'
                        )}
                        className="min-h-[250px]"
                        maxLength={400}
                      />
                      {errors.about && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.about.message as string}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-row-reverse mt-0 mx-5 mb-5">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black text-white hover:bg-black/90 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {isSubmitting
                    ? t('dashboard.organization.settings.saving')
                    : t('dashboard.organization.settings.save_changes')}
                </Button>
              </div>
            </div>
          </form>
    </div>
  )
}

export default OrgEditGeneral
