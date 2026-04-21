import FormLayout, {
  FormField,
  FormLabel,
  FormMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import { Label } from '@components/ui/label'
import React, { useState, useRef } from 'react'
import * as Form from '@radix-ui/react-form'
import BarLoader from 'react-spinners/BarLoader'
import {
  Youtube,
  Upload,
  Video,
  Clock,
  CheckCircle2,
  FileUp,
} from 'lucide-react'
import { constructAcceptValue } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'

const SUPPORTED_FILES = constructAcceptValue(['mp4', 'webm'])

interface VideoDetails {
  startTime: number
  endTime: number | null
  autoplay: boolean
  muted: boolean
}

interface ExternalVideoObject {
  name: string
  type: string
  uri: string
  chapter_id: string
  details: VideoDetails
}

function VideoModal({
  submitFileActivity,
  submitExternalVideo,
  chapterId,
  course,
}: any) {
  const [video, setVideo] = React.useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = React.useState('')
  const [youtubeUrl, setYoutubeUrl] = React.useState('')
  const [selectedView, setSelectedView] = React.useState<'file' | 'youtube'>(
    'file'
  )
  const [videoDetails, setVideoDetails] = React.useState<VideoDetails>({
    startTime: 0,
    endTime: null,
    autoplay: false,
    muted: false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setVideo(event.target.files[0])
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !name ||
      (selectedView === 'file' && !video) ||
      (selectedView === 'youtube' && !youtubeUrl)
    )
      return

    setIsSubmitting(true)

    try {
      if (selectedView === 'file' && video) {
        await submitFileActivity(
          video,
          'video',
          {
            name: name,
            chapter_id: chapterId,
            activity_type: 'TYPE_VIDEO',
            activity_sub_type: 'SUBTYPE_VIDEO_HOSTED',
            published_version: 1,
            version: 1,
            course_id: course.id,
            details: videoDetails,
          },
          chapterId
        )
      }

      if (selectedView === 'youtube') {
        const external_video_object: ExternalVideoObject = {
          name,
          type: 'youtube',
          uri: youtubeUrl,
          chapter_id: chapterId,
          details: videoDetails,
        }

        await submitExternalVideo(external_video_object, 'activity', chapterId)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderVideoSettingsForm = () => {
    const convertToSeconds = (minutes: number, seconds: number) => {
      return minutes * 60 + seconds
    }

    const convertFromSeconds = (totalSeconds: number) => {
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return { minutes, seconds }
    }

    const startTimeParts = convertFromSeconds(videoDetails.startTime)
    const endTimeParts = videoDetails.endTime
      ? convertFromSeconds(videoDetails.endTime)
      : { minutes: 0, seconds: 0 }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 mt-6 p-5 bg-zinc-50 border border-zinc-200 rounded-2xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Video Settings</h3>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Start Time
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  value={startTimeParts.minutes}
                  onChange={(e) => {
                    const minutes = Math.max(0, parseInt(e.target.value) || 0)
                    const seconds = startTimeParts.seconds
                    setVideoDetails({
                      ...videoDetails,
                      startTime: convertToSeconds(minutes, seconds),
                    })
                  }}
                  className="bg-white border-zinc-200 focus:border-zinc-900 transition-all rounded-xl py-2 px-3 text-sm"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block font-medium">
                  Min
                </span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={startTimeParts.seconds}
                  onChange={(e) => {
                    const minutes = startTimeParts.minutes
                    const seconds = Math.max(
                      0,
                      Math.min(59, parseInt(e.target.value) || 0)
                    )
                    setVideoDetails({
                      ...videoDetails,
                      startTime: convertToSeconds(minutes, seconds),
                    })
                  }}
                  className="bg-white border-zinc-200 focus:border-zinc-900 transition-all rounded-xl py-2 px-3 text-sm"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block font-medium">
                  Sec
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              End Time (Optional)
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  value={endTimeParts.minutes}
                  onChange={(e) => {
                    const minutes = Math.max(0, parseInt(e.target.value) || 0)
                    const seconds = endTimeParts.seconds
                    const totalSeconds = convertToSeconds(minutes, seconds)
                    setVideoDetails({
                      ...videoDetails,
                      endTime: totalSeconds || null,
                    })
                  }}
                  className="bg-white border-zinc-200 focus:border-zinc-900 transition-all rounded-xl py-2 px-3 text-sm"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block font-medium">
                  Min
                </span>
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={endTimeParts.seconds}
                  onChange={(e) => {
                    const minutes = endTimeParts.minutes
                    const seconds = Math.max(
                      0,
                      Math.min(59, parseInt(e.target.value) || 0)
                    )
                    const totalSeconds = convertToSeconds(minutes, seconds)
                    setVideoDetails({
                      ...videoDetails,
                      endTime: totalSeconds || null,
                    })
                  }}
                  className="bg-white border-zinc-200 focus:border-zinc-900 transition-all rounded-xl py-2 px-3 text-sm"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block font-medium">
                  Sec
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={videoDetails.autoplay}
                onChange={(e) =>
                  setVideoDetails({
                    ...videoDetails,
                    autoplay: e.target.checked,
                  })
                }
                className="peer hidden"
              />
              <div className="w-5 h-5 border-2 border-zinc-300 rounded-md peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-950 transition-colors">
              Autoplay video
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={videoDetails.muted}
                onChange={(e) =>
                  setVideoDetails({
                    ...videoDetails,
                    muted: e.target.checked,
                  })
                }
                className="peer hidden"
              />
              <div className="w-5 h-5 border-2 border-zinc-300 rounded-md peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
            </div>
            <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-950 transition-colors">
              Start muted
            </span>
          </label>
        </div>
      </motion.div>
    )
  }

  return (
    <FormLayout onSubmit={handleSubmit} className="space-y-6">
      <FormField name="video-activity-name">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FormLabel className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Video size={16} className="text-zinc-500" />
              Activity Name
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              placeholder="e.g. Masterclass Introduction"
              className="pl-4 pr-4 py-3 bg-zinc-50 border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-all rounded-xl w-full"
            />
          </Form.Control>
        </div>
      </FormField>

      <div className="bg-zinc-50/50 border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 p-1 gap-1 bg-zinc-100/50">
          <button
            type="button"
            onClick={() => setSelectedView('file')}
            className={`
              flex items-center justify-center py-2.5 px-4 gap-2.5 rounded-xl font-bold text-xs transition-all
              ${
                selectedView === 'file'
                  ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
              }
            `}
          >
            <Upload size={14} />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedView('youtube')}
            className={`
              flex items-center justify-center py-2.5 px-4 gap-2.5 rounded-xl font-bold text-xs transition-all
              ${
                selectedView === 'youtube'
                  ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-white/50'
              }
            `}
          >
            <Youtube
              size={14}
              className={selectedView === 'youtube' ? 'text-rose-500' : ''}
            />
            <span>YouTube Link</span>
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {selectedView === 'file' && (
              <motion.div
                key="file-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      Video File
                    </Label>
                  </div>

                  <div
                    onClick={triggerFileSelect}
                    className={`
                      relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-2
                      ${
                        video
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
                      }
                    `}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="video-activity-file"
                      accept={SUPPORTED_FILES}
                      onChange={handleVideoChange}
                      required={selectedView === 'file'}
                      className="hidden"
                    />
                    <div
                      className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-colors
                      ${video ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400 group-hover:text-zinc-500'}
                    `}
                    >
                      {video ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <FileUp size={20} />
                      )}
                    </div>

                    <div className="space-y-1">
                      <p
                        className={`font-bold text-sm ${video ? 'text-emerald-900' : 'text-zinc-900'}`}
                      >
                        {video ? video.name : 'Select video file'}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {video
                          ? `${(video.size / 1024 / 1024).toFixed(2)} MB`
                          : 'MP4, WebM up to 500MB'}
                      </p>
                    </div>
                  </div>
                </div>
                {renderVideoSettingsForm()}
              </motion.div>
            )}

            {selectedView === 'youtube' && (
              <motion.div
                key="youtube-view"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      YouTube URL
                    </Label>
                  </div>
                  <div className="relative">
                    <Youtube
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <Input
                      id="youtube-url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      type="text"
                      required={selectedView === 'youtube'}
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-11 pr-4 py-3 bg-white border-zinc-200 focus:border-zinc-900 transition-all rounded-xl w-full"
                    />
                  </div>
                </div>
                {renderVideoSettingsForm()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <Form.Submit asChild>
          <motion.button
            whileHover={{ scale: 1.01, translateY: -0.5 }}
            whileTap={{ scale: 0.99 }}
            disabled={
              isSubmitting ||
              !name ||
              (selectedView === 'file' && !video) ||
              (selectedView === 'youtube' && !youtubeUrl)
            }
            className={`
              relative overflow-hidden group py-3 px-10 rounded-xl font-bold text-sm tracking-tight transition-all duration-300 flex items-center justify-center shadow-lg active:shadow-sm
              ${
                isSubmitting ||
                !name ||
                (selectedView === 'file' && !video) ||
                (selectedView === 'youtube' && !youtubeUrl)
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

export default VideoModal
