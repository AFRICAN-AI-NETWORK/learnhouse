import React, { useState } from 'react'
import FormLayout, {
  FormField,
  FormLabel,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import * as Form from '@radix-ui/react-form'
import { BarLoader } from 'react-spinners'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl } from '@services/config/config'
import { mutate } from 'swr'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { createActivity } from '@services/courses/activities'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Video, Clock, Calendar, Users, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

function LiveSessionModal({
  submitActivity,
  chapterId,
  course,
  closeModal,
}: any) {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [chatEnabled, setChatEnabled] = useState(true)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [recordingUrl, setRecordingUrl] = useState('')

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!name || !startTime) return

    setIsSubmitting(true)

    // Details for the JSON field in DB
    const details = {
      live_url: '', // Default to Jitsi room if empty
      start_time: startTime,
      duration: parseInt(duration),
      external_signup_enabled: registrationEnabled,
      chat_enabled: chatEnabled,
      recording_url: recordingUrl,
      jitsi_room: `aan-${Math.random().toString(36).substring(7)}`,
    }

    const activity = {
      name: name,
      chapter_id: chapterId,
      activity_type: 'TYPE_LIVE_SESSION',
      activity_sub_type: 'SUBTYPE_LIVE_JITSI',
      published: false,
      course_id: course?.id || course?.courseStructure?.id,
      details: details,
      content: {},
    }

    try {
      const res = await createActivity(
        activity,
        chapterId,
        org?.id,
        session.data?.tokens?.access_token
      )

      if (res.id) {
        toast.success('Live Session created successfully')
        mutate(
          `${getAPIUrl()}courses/${course.courseStructure?.course_uuid || course.course_uuid}/meta`
        )
        closeModal()
      } else {
        toast.error('Failed to create live session')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="live-activity-name">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Video size={16} className="text-zinc-500" />
              Session Title
            </FormLabel>
          </div>
          <Form.Control asChild>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              placeholder="e.g. Welcome Workshop: AAN Fundamentals"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <div className="grid grid-cols-2 gap-6">
        <FormField name="live-activity-start-time">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                <Calendar size={16} className="text-zinc-500" />
                Start Time
              </FormLabel>
            </div>
            <Form.Control asChild>
              <Input
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                type="datetime-local"
                required
                className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
              />
            </Form.Control>
          </div>
        </FormField>

        <FormField name="live-activity-duration">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                <Clock size={16} className="text-zinc-500" />
                Duration (min)
              </FormLabel>
            </div>
            <Form.Control asChild>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                type="number"
                min="1"
                required
                className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
              />
            </Form.Control>
          </div>
        </FormField>
      </div>

      <FormField name="live-activity-recording-url">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Video size={16} className="text-zinc-500" />
              YouTube Live Link (Optional)
            </FormLabel>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">
              For Auto-Replay
            </span>
          </div>
          <Form.Control asChild>
            <Input
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              type="url"
              placeholder="https://youtube.com/live/..."
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
          <p className="text-[9px] text-zinc-400 font-medium">
            If provided, this video will automatically appear as the replay once
            the session ends.
          </p>
        </div>
      </FormField>

      <div className="space-y-4 pt-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={chatEnabled}
              onChange={(e) => setChatEnabled(e.target.checked)}
              className="peer hidden"
            />
            <div className="w-5 h-5 border-2 border-zinc-300 rounded-md peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-950 transition-colors flex items-center gap-2">
            <MessageSquare size={14} />
            Enable Live Chat
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={registrationEnabled}
              onChange={(e) => setRegistrationEnabled(e.target.checked)}
              className="peer hidden"
            />
            <div className="w-5 h-5 border-2 border-zinc-300 rounded-md peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-950 transition-colors flex items-center gap-2">
            <Users size={14} />
            Require Session Registration
          </span>
        </label>
      </div>

      <div className="flex justify-end mt-8">
        <Form.Submit asChild>
          <motion.button
            whileHover={{ scale: 1.01, translateY: -0.5 }}
            whileTap={{ scale: 0.99 }}
            disabled={isSubmitting || !name || !startTime}
            className={`
              relative overflow-hidden group py-3 px-10 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 flex items-center justify-center shadow-lg active:shadow-sm
              ${
                isSubmitting || !name || !startTime
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed shadow-none'
                  : 'bg-zinc-900 text-white hover:bg-black'
              }
            `}
          >
            <div className="absolute inset-0 bg-linear-to-tr from-zinc-900 via-zinc-800 to-zinc-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10">
              {isSubmitting ? (
                <BarLoader width={80} color="#ffffff" />
              ) : (
                'Schedule Live Session'
              )}
            </span>
          </motion.button>
        </Form.Submit>
      </div>
    </FormLayout>
  )
}

export default LiveSessionModal
