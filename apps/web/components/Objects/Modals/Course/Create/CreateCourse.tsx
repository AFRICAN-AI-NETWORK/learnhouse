'use client'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import FormLayout, {
  FormField,
  FormLabelAndMessage,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import { createNewCourse } from '@services/courses/courses'
import { getOrganizationContextInfoWithoutCredentials } from '@services/organizations/orgs'
import React, { useEffect } from 'react'
import { BarLoader } from 'react-spinners'
import { revalidateTags } from '@services/utils/ts/requests'
import { useRouter } from 'next/navigation'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { UploadCloud, Image as ImageIcon } from 'lucide-react'
import UnsplashImagePicker from '@components/Dashboard/Pages/Course/EditCourseGeneral/UnsplashImagePicker'
import FormTagInput from '@components/Objects/StyledElements/Form/TagInput'
import { useTranslation } from 'react-i18next'
import NextImage from 'next/image'

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required('Course name is required')
    .max(100, 'Must be 100 characters or less'),
  description: Yup.string().max(1000, 'Must be 1000 characters or less'),
  learnings: Yup.string(),
  tags: Yup.string(),
  visibility: Yup.boolean(),
  thumbnail: Yup.mixed().nullable(),
})

function CreateCourseModal({ closeModal, orgslug }: any) {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useLHSession() as any
  const [orgId, setOrgId] = React.useState(null) as any
  const [showUnsplashPicker, setShowUnsplashPicker] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required(t('courses.course_name_required'))
      .max(100, 'Must be 100 characters or less'),
    description: Yup.string().max(1000, 'Must be 1000 characters or less'),
    learnings: Yup.string(),
    tags: Yup.string(),
    visibility: Yup.boolean(),
    thumbnail: Yup.mixed().nullable(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      learnings: '',
      visibility: true,
      tags: '',
      thumbnail: null as File | null,
    },
    resolver: yupResolver(validationSchema) as any,
  })

  const thumbnail = watch('thumbnail')

  const onSubmit = async (values: any) => {
    const toast_loading = toast.loading(t('courses.creating_course'))

    try {
      const res = await createNewCourse(
        orgId,
        {
          name: values.name,
          description: values.description,
          learnings: values.learnings,
          tags: values.tags,
          visibility: values.visibility,
        },
        values.thumbnail,
        session.data?.tokens?.access_token
      )

      if (res.success) {
        await revalidateTags(['courses'], orgslug)
        toast.dismiss(toast_loading)
        toast.success(t('courses.course_created_success'))

        if (res.data.org_id === orgId) {
          closeModal()
          router.refresh()
          await revalidateTags(['courses'], orgslug)
        }
      } else {
        toast.error(res.data.detail)
      }
    } catch (error) {
      toast.error(t('courses.failed_to_create_course'))
    } finally {
      toast.dismiss(toast_loading)
    }
  }

  useEffect(() => {
    const getOrgMetadata = async () => {
      const org = await getOrganizationContextInfoWithoutCredentials(orgslug, {
        revalidate: 360,
        tags: ['organizations'],
      })
      setOrgId(org.id)
    }

    if (orgslug) {
      getOrgMetadata()
    }
  }, [orgslug])

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      setValue('thumbnail', file, { shouldValidate: true })
    }
  }

  const handleUnsplashSelect = async (imageUrl: string) => {
    setIsUploading(true)
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'unsplash_image.jpg', {
        type: 'image/jpeg',
      })
      setValue('thumbnail', file, { shouldValidate: true })
    } catch (error) {
      toast.error('Failed to load image from Unsplash')
    }
    setIsUploading(false)
  }

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <FormField name="name">
        <FormLabelAndMessage
          label={t('courses.course_name')}
          message={errors.name?.message}
        />
        <Form.Control asChild>
          <Input {...register('name')} type="text" required />
        </Form.Control>
      </FormField>

      <FormField name="description">
        <FormLabelAndMessage
          label={t('collections.description')}
          message={errors.description?.message}
        />
        <Form.Control asChild>
          <Textarea {...register('description')} />
        </Form.Control>
      </FormField>

      <FormField name="thumbnail">
        <FormLabelAndMessage
          label={t('courses.course_thumbnail')}
          message={errors.thumbnail?.message}
        />
        <div className="w-auto bg-gray-50 rounded-xl outline-1 outline-gray-200 h-[200px] shadow-sm">
          <div className="flex flex-col justify-center items-center h-full">
            <div className="flex flex-col justify-center items-center">
              {thumbnail ? (
                <NextImage
                  src={URL.createObjectURL(thumbnail)}
                  alt="Course thumbnail preview"
                  className={`${isUploading ? 'animate-pulse' : ''} shadow-sm w-[200px] h-[100px] rounded-md`}
                  width={800}
                  height={800}
                />
              ) : (
                <NextImage
                  src="/empty_thumbnail.png"
                  alt="Empty thumbnail placeholder"
                  className="shadow-sm w-[200px] h-[100px] rounded-md bg-gray-200"
                  width={800}
                  height={800}
                />
              )}
              <div className="flex justify-center items-center space-x-2">
                <input
                  type="file"
                  id="fileInput"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                />
                <button
                  type="button"
                  className="font-bold antialiased items-center text-gray text-sm rounded-md px-4 mt-6 flex"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <UploadCloud size={16} className="mr-2" />
                  <span>{t('courses.upload_image')}</span>
                </button>
                <button
                  type="button"
                  className="font-bold antialiased items-center text-gray text-sm rounded-md px-4 mt-6 flex"
                  onClick={() => setShowUnsplashPicker(true)}
                >
                  <ImageIcon size={16} className="mr-2" />
                  <span>{t('courses.choose_from_gallery')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </FormField>

      <FormField name="learnings">
        <FormLabelAndMessage
          label={t('courses.course_learnings')}
          message={errors.learnings?.message}
        />
        <FormTagInput
          placeholder={t('courses.enter_to_add')}
          value={watch('learnings')}
          onChange={(value) =>
            setValue('learnings', value, { shouldValidate: true })
          }
          error={errors.learnings?.message}
        />
      </FormField>

      <FormField name="tags">
        <FormLabelAndMessage
          label={t('courses.course_tags')}
          message={errors.tags?.message}
        />
        <FormTagInput
          placeholder={t('courses.enter_to_add')}
          value={watch('tags')}
          onChange={(value) =>
            setValue('tags', value, { shouldValidate: true })
          }
          error={errors.tags?.message}
        />
      </FormField>

      <FormField name="visibility">
        <FormLabelAndMessage
          label={t('courses.course_visibility')}
          message={errors.visibility?.message as string}
        />
        <Select
          value={watch('visibility').toString()}
          onValueChange={(value) =>
            setValue('visibility', value === 'true', { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('courses.select_visibility')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">
              {t('courses.public')} ({t('courses.public_desc')})
            </SelectItem>
            <SelectItem value="false">
              {t('courses.private')} ({t('courses.private_desc')})
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <div className="flex justify-end mt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-black text-white text-sm font-bold rounded-md"
        >
          {isSubmitting ? (
            <BarLoader
              cssOverride={{ borderRadius: 60 }}
              width={60}
              color="#ffffff"
            />
          ) : (
            t('courses.create_course_btn')
          )}
        </button>
      </div>

      {showUnsplashPicker && (
        <UnsplashImagePicker
          onSelect={handleUnsplashSelect}
          onClose={() => setShowUnsplashPicker(false)}
        />
      )}
    </FormLayout>
  )
}

export default CreateCourseModal
