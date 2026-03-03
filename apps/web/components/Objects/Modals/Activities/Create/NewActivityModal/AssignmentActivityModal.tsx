import React from 'react'
import FormLayout, {
  FormField,
  FormLabel,
  FormMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import { BarLoader } from 'react-spinners'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import { mutate } from 'swr'
import { createAssignment } from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { createActivity, deleteActivity } from '@services/courses/activities'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ClipboardList, AlignLeft, Calendar, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'

function NewAssignment({ submitActivity, chapterId, course, closeModal }: any) {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const [activityName, setActivityName] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [activityDescription, setActivityDescription] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [gradingType, setGradingType] = React.useState('ALPHABET')

  const handleNameChange = (e: any) => {
    setActivityName(e.target.value)
  }

  const handleDescriptionChange = (e: any) => {
    setActivityDescription(e.target.value)
  }

  const handleDueDateChange = (e: any) => {
    setDueDate(e.target.value)
  }

  const handleGradingTypeChange = (e: any) => {
    setGradingType(e.target.value)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!activityName || !dueDate) return

    setIsSubmitting(true)
    const activity = {
      name: activityName,
      chapter_id: chapterId,
      activity_type: 'TYPE_ASSIGNMENT',
      activity_sub_type: 'SUBTYPE_ASSIGNMENT_ANY',
      published: false,
      course_id: course?.courseStructure.id,
    }

    const activity_res = await createActivity(
      activity,
      chapterId,
      org?.id,
      session.data?.tokens?.access_token
    )
    const res = await createAssignment(
      {
        title: activityName,
        description: activityDescription,
        due_date: dueDate,
        grading_type: gradingType,
        course_id: course?.courseStructure.id,
        org_id: org?.id,
        chapter_id: chapterId,
        activity_id: activity_res?.id,
      },
      session.data?.tokens?.access_token
    )
    const toast_loading = toast.loading(
      t('dashboard.assignments.modals.create.toasts.creating')
    )

    if (res.success) {
      toast.dismiss(toast_loading)
      toast.success(t('dashboard.assignments.modals.create.toasts.success'))
    } else {
      toast.error(res.data.detail)
      await deleteActivity(
        activity_res.activity_uuid,
        session.data?.tokens?.access_token
      )
    }

    mutate(`${getAPIUrl()}courses/${course.courseStructure.course_uuid}/meta`)
    setIsSubmitting(false)
    closeModal()
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="assignment-activity-title">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <ClipboardList size={16} className="text-zinc-500" />
              {t('dashboard.assignments.modals.create.form.title_label')}
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              {t('dashboard.assignments.modals.create.form.title_required')}
            </FormMessage>
          </div>
          <Form.Control asChild>
            <Input
              onChange={handleNameChange}
              type="text"
              required
              placeholder="e.g. Final Project"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <FormField name="assignment-activity-description">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <AlignLeft size={16} className="text-zinc-500" />
              {t('dashboard.assignments.modals.create.form.description_label')}
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              {t(
                'dashboard.assignments.modals.create.form.description_required'
              )}
            </FormMessage>
          </div>
          <Form.Control asChild>
            <Input
              onChange={handleDescriptionChange}
              type="text"
              required
              placeholder="Describe the assignment goals..."
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-6">
        <FormField name="assignment-activity-due-date">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                <Calendar size={16} className="text-zinc-500" />
                {t('dashboard.assignments.modals.create.form.due_date_label')}
              </FormLabel>
            </div>
            <Form.Control asChild>
              <Input
                onChange={handleDueDateChange}
                type="date"
                required
                className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
              />
            </Form.Control>
          </div>
        </FormField>

        <FormField name="assignment-activity-grading-type">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                <GraduationCap size={16} className="text-zinc-500" />
                {t(
                  'dashboard.assignments.modals.create.form.grading_type_label'
                )}
              </FormLabel>
            </div>
            <Form.Control asChild>
              <select
                className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all appearance-none cursor-pointer"
                onChange={handleGradingTypeChange}
                required
              >
                <option value="ALPHABET">
                  {t(
                    'dashboard.assignments.modals.create.form.grading_types.alphabet'
                  )}
                </option>
                <option value="NUMERIC">
                  {t(
                    'dashboard.assignments.modals.create.form.grading_types.numeric'
                  )}
                </option>
                <option value="PERCENTAGE">
                  {t(
                    'dashboard.assignments.modals.create.form.grading_types.percentage'
                  )}
                </option>
              </select>
            </Form.Control>
          </div>
        </FormField>
      </div>

      <div className="flex justify-end mt-8">
        <Form.Submit asChild>
          <motion.button
            whileHover={{ scale: 1.01, translateY: -0.5 }}
            whileTap={{ scale: 0.99 }}
            disabled={isSubmitting || !activityName || !dueDate}
            className={`
                          relative overflow-hidden group py-3 px-10 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 flex items-center justify-center shadow-lg active:shadow-sm
                          ${
                            isSubmitting || !activityName || !dueDate
                              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                              : 'bg-zinc-900 text-white hover:bg-black'
                          }
                        `}
          >
            <div className="absolute inset-0 bg-linear-to-tr from-zinc-900 via-zinc-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <span className="relative z-10">
              {isSubmitting ? (
                <BarLoader
                  cssOverride={{ borderRadius: 60 }}
                  width={80}
                  color="#ffffff"
                />
              ) : (
                t('dashboard.assignments.modals.create.form.submit')
              )}
            </span>
          </motion.button>
        </Form.Submit>
      </div>
    </FormLayout>
  )
}

export default NewAssignment
