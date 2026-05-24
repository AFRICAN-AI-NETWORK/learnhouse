import FormLayout, {
  FormField,
  FormLabel,
  FormMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import React, { useState } from 'react'
import * as Form from '@radix-ui/react-form'
import BarLoader from 'react-spinners/BarLoader'
import { ClipboardCheck, AlignLeft } from 'lucide-react'
import { motion } from 'framer-motion'

function AttendanceActivityModal({ submitActivity, chapterId, course }: any) {
  const [activityName, setActivityName] = useState('')
  const [attendanceType, setAttendanceType] = useState<'weekly' | 'onetime'>(
    'weekly'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleActivityNameChange = (e: any) => {
    setActivityName(e.target.value)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!activityName) return

    setIsSubmitting(true)
    await submitActivity({
      name: activityName,
      chapter_id: chapterId,
      activity_type: 'TYPE_ATTENDANCE',
      activity_sub_type:
        attendanceType === 'weekly'
          ? 'SUBTYPE_ATTENDANCE_WEEKLY'
          : 'SUBTYPE_ATTENDANCE_ONETIME',
      published_version: 1,
      version: 1,
      course_id: course.courseStructure?.id || course.id,
    })
    setIsSubmitting(false)
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="attendance-activity-name">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <ClipboardCheck size={16} className="text-zinc-500" />
              Attendance name
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
              placeholder="e.g. Weekly Attendance Check"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <FormField name="attendance-type">
        <div className="flex flex-col gap-2">
          <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
            <AlignLeft size={16} className="text-zinc-500" />
            Attendance type
          </FormLabel>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setAttendanceType('weekly')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                attendanceType === 'weekly'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              Weekly
              <p
                className={`text-[10px] font-normal mt-0.5 ${attendanceType === 'weekly' ? 'text-zinc-300' : 'text-zinc-400'}`}
              >
                Recurring every week
              </p>
            </button>
            <button
              type="button"
              onClick={() => setAttendanceType('onetime')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                attendanceType === 'onetime'
                  ? 'border-zinc-900 bg-zinc-900 text-white shadow-lg'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100'
              }`}
            >
              One-time
              <p
                className={`text-[10px] font-normal mt-0.5 ${attendanceType === 'onetime' ? 'text-zinc-300' : 'text-zinc-400'}`}
              >
                Single attendance check
              </p>
            </button>
          </div>
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
                'Create attendance'
              )}
            </span>
          </motion.button>
        </Form.Submit>
      </div>
    </FormLayout>
  )
}

export default AttendanceActivityModal
