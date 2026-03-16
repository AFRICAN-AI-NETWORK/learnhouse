'use client'
import React, { useState } from 'react'
import {
  Megaphone,
  Send,
  Users,
  History,
  Mail,
  MessageSquare,
  AlertCircle,
  Video,
  ChevronRight,
  ImagePlus,
  Upload,
  Loader2,
  X,
} from 'lucide-react'
// Imports removed to fix lint warnings
import {
  createCampaign,
  getCampaigns,
  getLiveSessions,
  uploadCampaignImage,
} from '@services/communications'
import { getCampaignMediaUrl } from '@services/media/media'
import { getOrgCourses } from '@services/courses/courses'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import Link from 'next/link'
import { BarLoader } from 'react-spinners'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'react-hot-toast'

export default function CommunicationsPage() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState('ALL')
  const [targetValue, setTargetValue] = useState('')
  const [includeChat, setIncludeChat] = useState(true)
  const [headerImageUrl, setHeaderImageUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { mutate } = useSWRConfig()

  // Use SWR for stable data fetching
  const {
    data: campaigns = [],
    error: campaignsError,
    isLoading: loadingCampaigns,
  } = useSWR(
    org?.org_slug && access_token
      ? [`${org.org_slug}_campaigns`, access_token]
      : null,
    () => getCampaigns(access_token, org?.org_slug)
  )

  const { data: courses = [] } = useSWR(
    org?.org_slug && access_token
      ? [`${org.org_slug}_courses`, access_token]
      : null,
    () => getOrgCourses(org?.org_slug, null, access_token)
  )

  const { data: liveSessions = [] } = useSWR(
    org?.org_slug && access_token
      ? [`${org.org_slug}_sessions`, access_token]
      : null,
    () => getLiveSessions(access_token, org?.org_slug)
  )

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const result = await uploadCampaignImage(
        file,
        access_token,
        org?.org_slug
      )
      if (result && result.filename) {
        const fullUrl = getCampaignMediaUrl(org.org_uuid, result.filename)
        setHeaderImageUrl(fullUrl)
        toast.success('Image uploaded successfully!')
      }
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !body) return

    setIsSubmitting(true)
    try {
      const data = {
        subject,
        body,
        target_type: targetType,
        target_metadata: {
          value: targetValue,
          header_image_url: headerImageUrl,
        },
        send_via_chat: includeChat,
      }
      await createCampaign(data, access_token, org?.org_slug)
      toast.success('Campaign initiated! Sending messages in background.')

      // Revalidate history
      mutate([`${org.org_slug}_campaigns`, access_token])

      // Reset form
      setSubject('')
      setBody('')
      setHeaderImageUrl('')
    } catch (e) {
      toast.error('Failed to initiate campaign')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto min-h-screen">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            <Megaphone className="text-zinc-400" /> Communications Hub
          </h1>
          <p className="text-zinc-500 font-medium">
            Broadcast messages to your organization community.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSend}
            className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-50 pb-4">
              <Send size={16} /> New Campaign
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1">
                  Campaign Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  type="text"
                  placeholder="e.g. Important Update: New Course Requirements"
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
                  required
                />
              </div>

              {/* Header Image */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImagePlus size={14} /> Header Image
                    <span className="text-zinc-300 font-medium normal-case tracking-normal">
                      (optional banner for email)
                    </span>
                  </div>
                </label>

                <div className="flex gap-2">
                  <input
                    value={headerImageUrl}
                    onChange={(e) => setHeaderImageUrl(e.target.value)}
                    type="url"
                    placeholder="https://example.com/banner.png or upload..."
                    className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-zinc-50 border border-zinc-100 p-3 rounded-2xl hover:bg-zinc-100 transition-all text-zinc-500 hover:text-zinc-900 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                  </button>
                </div>

                {headerImageUrl && (
                  <div className="relative mt-2 rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50 group">
                    <img
                      src={headerImageUrl}
                      alt="Header preview"
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setHeaderImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1">
                  Message Content
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  placeholder="Write your email and announcement content here..."
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-medium resize-none"
                  required
                />
                <p className="ml-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                  Email & Chat Announcement
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1">
                    Target Audience
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-bold appearance-none cursor-pointer"
                  >
                    <option value="ALL">All Users</option>
                    <option value="WAITLIST">Waitlist Only</option>
                    <option value="COURSE">Specific Course</option>
                    <option value="ROLES">By Role</option>
                  </select>
                </div>

                {targetType === 'COURSE' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1">
                      Select Course
                    </label>
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-bold appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select a course...</option>
                      {courses.map((c: any) => (
                        <option key={c.id} value={c.course_uuid}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'ROLES' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-wider pl-1">
                      Select Role
                    </label>
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all font-bold appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Select a role...</option>
                      <option value="Admin">Admins Only</option>
                      <option value="Instructor">Instructors Only</option>
                      <option value="Lead Instructor">Lead Instructors</option>
                      <option value="Teaching Assistant">
                        Teaching Assistants
                      </option>
                      <option value="Community Manager">
                        Community Managers
                      </option>
                      <option value="Students Success Coordinator">
                        Success Coordinators
                      </option>
                      <option value="Students Mentor">Student Mentors</option>
                      <option value="User">Students (Users)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-zinc-50">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={includeChat}
                    onChange={(e) => setIncludeChat(e.target.checked)}
                    className="peer hidden"
                  />
                  <div className="w-5 h-5 border-2 border-zinc-200 rounded-md peer-checked:bg-zinc-950 peer-checked:border-zinc-950 transition-all flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-sm opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-[10px] font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={14} /> Global Chat Post
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-zinc-900 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-xl hover:shadow-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-300"
              >
                {isSubmitting ? (
                  <BarLoader width={80} color="#ffffff" />
                ) : (
                  <>
                    Dispatch Campaign <Send size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
              <History size={16} /> Campaign History
            </div>

            {loadingCampaigns ? (
              <div className="text-center py-12">
                <BarLoader width={100} color="#e5e7eb" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 space-y-3 opacity-20">
                <Mail size={40} className="mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  No campaigns sent
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {campaigns.map((camp: any) => (
                  <div
                    key={camp.id}
                    className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-xs space-y-2 hover:border-zinc-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          camp.status === 'SENT'
                            ? 'bg-emerald-50 text-emerald-600'
                            : camp.status === 'PROCESSING'
                              ? 'bg-blue-50 text-blue-600 animate-pulse'
                              : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {camp.status}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold">
                        {new Date(camp.creation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-zinc-900 truncate tracking-tight">
                      {camp.subject}
                    </h4>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-bold uppercase tracking-tight">
                      <Users size={10} /> {camp.target_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle size={60} className="text-white" />
            </div>
            <h4 className="flex items-center gap-2 text-white font-black text-xs uppercase tracking-widest relative z-10">
              Quick Tip
            </h4>
            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mt-3 relative z-10">
              Targeting waitlisted students is the most effective way to drive
              enrolment for new course cohorts.
            </p>
          </div>
        </div>
      </div>

      {/* Live Sessions Management Section */}
      {liveSessions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase tracking-widest">
            <Video size={16} /> Manage Live Sessions
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((session: any) => (
              <Link
                key={session.id}
                href={`/dash/communications/participants/${session.activity_uuid}`}
                className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm hover:border-zinc-900 transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                    <Video size={20} />
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-zinc-300 group-hover:text-zinc-900 transition-colors"
                  />
                </div>
                <h4 className="font-black text-zinc-900 tracking-tight mb-1 truncate">
                  {session.name}
                </h4>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center justify-between">
                  <span>
                    {new Date(session.details?.start_time).toLocaleDateString()}
                  </span>
                  <span className="bg-zinc-50 px-2 py-0.5 rounded text-[8px] border border-zinc-100">
                    {session.course_name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
