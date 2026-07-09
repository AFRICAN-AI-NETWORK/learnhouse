'use client'
import React from 'react'
import { useForm } from 'react-hook-form'
import { updateOrganization } from '@services/settings/org'
import { revalidateTags } from '@services/utils/ts/requests'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { toast } from 'react-hot-toast'
import { Input } from "@components/ui/input"
import { Button } from "@components/ui/button"
import { Label } from "@components/ui/label"
import {
  SiX,
  SiFacebook,
  SiInstagram,
  SiYoutube
} from '@icons-pack/react-simple-icons'
import { Plus, X as XIcon } from "lucide-react"
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { useTranslation } from 'react-i18next'

interface OrganizationValues {
  socials: {
    twitter?: string
    facebook?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
  links: {
    [key: string]: string
  }
}

export default function OrgEditSocials() {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const org = useOrg() as any
  const router = useRouter()
  const initialValues: OrganizationValues = React.useMemo(() => ({
    socials: org?.socials || {},
    links: org?.links || {}
  }), [org?.socials, org?.links])

  const updateOrg = async (values: OrganizationValues) => {
    const loadingToast = toast.loading(t('dashboard.organization.settings.updating'))
    try {
      await updateOrganization(org.id, values, access_token)
      await revalidateTags(['organizations'], org.slug)

      mutate(`${getAPIUrl()}orgs/slug/${org.slug}`)
      toast.success(t('dashboard.organization.settings.update_success'), { id: loadingToast })
    } catch (err) {
      toast.error(t('dashboard.organization.settings.update_error'), { id: loadingToast })
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting }
  } = useForm<OrganizationValues>({
    defaultValues: initialValues
  })

  React.useEffect(() => {
    reset(initialValues)
  }, [initialValues, reset])

  const formValues = watch()

  return (
    <div className="sm:mx-10 mx-0 bg-white rounded-xl nice-shadow">
      <form onSubmit={handleSubmit(updateOrg)}>
            <div className="flex flex-col gap-0">
              <div className="flex flex-col bg-gray-50 -space-y-1 px-5 py-3 mx-3 my-3 rounded-md">
                <h1 className="font-bold text-xl text-gray-800">
                  {t('dashboard.organization.socials.title')}
                </h1>
                <h2 className="text-gray-500 text-md">
                  {t('dashboard.organization.socials.subtitle')}
                </h2>
              </div>

              <div className="flex flex-col lg:flex-row lg:space-x-8 mt-0 mx-5 my-5">
                <div className="w-full space-y-6">
                  <div>
                    <Label className="text-lg font-semibold">{t('dashboard.organization.socials.labels.social_links')}</Label>
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg nice-shadow mt-2">
                      <div className="grid gap-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-[#1DA1F2]/10 rounded-md">
                            <SiX size={16} color="#1DA1F2"/>
                          </div>
                          <Input
                            id="socials.twitter"
                            {...register('socials.twitter')}
                            placeholder={t('dashboard.organization.socials.placeholders.twitter')}
                            className="h-9 bg-white"
                          />
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-[#1877F2]/10 rounded-md">
                            <SiFacebook size={16} color="#1877F2"/>
                          </div>
                          <Input
                            id="socials.facebook"
                            {...register('socials.facebook')}
                            placeholder={t('dashboard.organization.socials.placeholders.facebook')}
                            className="h-9 bg-white"
                          />
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-[#E4405F]/10 rounded-md">
                            <SiInstagram size={16} color="#E4405F"/>
                          </div>
                          <Input
                            id="socials.instagram"
                            {...register('socials.instagram')}
                            placeholder={t('dashboard.organization.socials.placeholders.instagram')}
                            className="h-9 bg-white"
                          />
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 flex items-center justify-center bg-[#FF0000]/10 rounded-md">
                            <SiYoutube size={16} color="#FF0000"/>
                          </div>
                          <Input
                            id="socials.youtube"
                            {...register('socials.youtube')}
                            placeholder={t('dashboard.organization.socials.placeholders.youtube')}
                            className="h-9 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-6">
                  <div>
                    <Label className="text-lg font-semibold">{t('dashboard.organization.socials.labels.custom_links')}</Label>
                    <div className="space-y-3 bg-gray-50/50 p-4 rounded-lg nice-shadow mt-2">
                      {Object.entries(formValues.links || {}).map(([linkKey, linkValue], index) => (
                        <div key={index} className="flex gap-3 items-center">
                          <div className="w-8 h-8 flex items-center justify-center bg-gray-200/50 rounded-md text-xs font-medium text-gray-600">
                            {index + 1}
                          </div>
                          <div className="flex-1 flex gap-2">
                            <Input
                              placeholder={t('dashboard.organization.socials.placeholders.label')}
                              value={linkKey}
                              className="h-9 w-1/3 bg-white"
                              onChange={(e) => {
                                const newLinks = { ...formValues.links };
                                delete newLinks[linkKey];
                                newLinks[e.target.value] = linkValue as string;
                                setValue('links', newLinks);
                              }}
                            />
                            <Input
                              placeholder={t('dashboard.organization.socials.placeholders.url')}
                              value={linkValue as string}
                              className="h-9 flex-1 bg-white"
                              onChange={(e) => {
                                const newLinks = { ...formValues.links };
                                newLinks[linkKey] = e.target.value;
                                setValue('links', newLinks);
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newLinks = { ...formValues.links };
                                delete newLinks[linkKey];
                                setValue('links', newLinks);
                              }}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {Object.keys(formValues.links || {}).length < 3 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const newLinks = { ...formValues.links };
                            newLinks[`Link ${Object.keys(newLinks).length + 1}`] = '';
                            setValue('links', newLinks);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('dashboard.organization.socials.add_link')}
                        </Button>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        {t('dashboard.organization.socials.custom_links_desc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row-reverse mt-3 mx-5 mb-5">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black text-white hover:bg-black/90"
                >
                  {isSubmitting ? t('dashboard.organization.settings.saving') : t('dashboard.organization.settings.save_changes')}
                </Button>
              </div>
            </div>
          </form>
    </div>
  )
}
