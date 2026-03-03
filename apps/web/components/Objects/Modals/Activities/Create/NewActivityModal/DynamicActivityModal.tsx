import FormLayout, {
  FormField,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@components/Objects/StyledElements/Form/Form'
import React, { useState } from 'react'
import * as Form from '@radix-ui/react-form'
import BarLoader from 'react-spinners/BarLoader'
import { Layout, AlignLeft } from 'lucide-react'
import { motion } from 'framer-motion'

function DynamicCanvaModal({ submitActivity, chapterId, course }: any) {
  const [activityName, setActivityName] = useState('')
  const [activityDescription, setActivityDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleActivityNameChange = (e: any) => {
    setActivityName(e.target.value)
  }

  const handleActivityDescriptionChange = (e: any) => {
    setActivityDescription(e.target.value)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!activityName) return

    setIsSubmitting(true)
    await submitActivity({
      name: activityName,
      chapter_id: chapterId,
      activity_type: 'TYPE_DYNAMIC',
      activity_sub_type: 'SUBTYPE_DYNAMIC_PAGE',
      published_version: 1,
      version: 1,
      course_id: course.id,
    })
    setIsSubmitting(false)
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="dynamic-activity-name">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Layout size={16} className="text-zinc-500" />
              Activity name
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              Name required
            </FormMessage>
          </div>
          <Form.Control asChild>
            <Input
              onChange={handleActivityNameChange}
              type="text"
              required
              placeholder="e.g. Interactive Workspace"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <FormField name="dynamic-activity-desc">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <AlignLeft size={16} className="text-zinc-500" />
              Activity description
            </FormLabel>
            <FormMessage
              match="valueMissing"
              className="text-[10px] font-bold text-rose-500 uppercase tracking-tight"
            >
              Description required
            </FormMessage>
          </div>
          <Form.Control asChild>
            <Textarea
              onChange={handleActivityDescriptionChange}
              placeholder="Briefly describe what students will do in this activity..."
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full min-h-[100px]"
            />
          </Form.Control>
        </div>
      </FormField>

      <div className="flex justify-end mt-8">
        <Form.Submit asChild>
          <motion.button
            whileHover={{ scale: 1.01, translateY: -0.5 }}
            whileTap={{ scale: 0.99 }}
            disabled={isSubmitting || !activityName}
            className={`
              relative overflow-hidden group py-3 px-10 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 flex items-center justify-center shadow-lg active:shadow-sm
              ${
                isSubmitting || !activityName
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
                'Create activity'
              )}
            </span>
          </motion.button>
        </Form.Submit>
      </div>
    </FormLayout>
  )
}

export default DynamicCanvaModal
