'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  History,
  Loader2,
  Mail,
  Megaphone,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from 'lucide-react'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'react-hot-toast'
import { BarLoader } from 'react-spinners'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  CampaignPayload,
  CampaignSection,
  CampaignTargetType,
  cancelCampaign,
  createCampaignDraft,
  getCampaign,
  getCampaignRecipients,
  getCampaigns,
  getLiveSessions,
  sendCampaignNow,
  updateCampaign,
  uploadCampaignImage,
} from '@services/communications'
import { getUriWithOrg } from '@services/config/config'
import { getOrgCourses } from '@services/courses/courses'
import {
  getCampaignMediaUrl,
  getCourseThumbnailMediaDirectory,
} from '@services/media/media'

type CampaignForm = {
  id?: number | string
  subject: string
  preheader: string
  sender_name: string
  reply_to_email: string
  campaign_type: 'COURSE_MARKETING' | 'GENERAL'
  target_type: CampaignTargetType
  target_course_uuid: string
  target_roles: string[]
  custom_emails: string
  scheduled_at: string
  sections: CampaignSection[]
}

const blankForm: CampaignForm = {
  subject: '',
  preheader: '',
  sender_name: '',
  reply_to_email: '',
  campaign_type: 'COURSE_MARKETING',
  target_type: 'ALL',
  target_course_uuid: '',
  target_roles: [],
  custom_emails: '',
  scheduled_at: '',
  sections: [
    {
      type: 'header',
      headline: 'Welcome to African AI Network Academy',
      body: 'Explore the latest learning opportunities prepared for your community.',
      image_url: '',
    },
    {
      type: 'footer',
      closing_text: 'Best regards, The Team',
      community_link: '',
    },
  ],
}

const sectionTypes = [
  { type: 'header', label: 'Header' },
  { type: 'text', label: 'Text' },
  { type: 'course', label: 'Course' },
  { type: 'image', label: 'Image' },
  { type: 'button', label: 'Button' },
  { type: 'footer', label: 'Footer' },
] as const

const roleOptions = [
  'admin',
  'instructor',
  'lead_instructor',
  'teaching_assistant',
  'community_manager',
  'student_success_coordinator',
  'student_mentor',
  'user',
]

const inputClass =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/25 dark:focus:border-white/25 dark:focus:ring-white/10'

const labelClass =
  'text-[11px] font-black uppercase tracking-wider text-zinc-500 dark:text-white/45'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getSectionTitle = (section: CampaignSection) =>
  section.type.charAt(0).toUpperCase() + section.type.slice(1)

const createSection = (type: CampaignSection['type']): CampaignSection => {
  if (type === 'header') return { type, headline: '', body: '', image_url: '' }
  if (type === 'text') return { type, heading: '', body: '' }
  if (type === 'course') {
    return {
      type,
      course_uuid: '',
      title: '',
      description: '',
      image_url: '',
      cta_label: 'View course',
      cta_url: '',
    }
  }
  if (type === 'image') return { type, image_url: '', alt_text: '' }
  if (type === 'button') return { type, label: 'Learn more', url: '' }
  return { type, closing_text: '', community_link: '' }
}

const getCampaignId = (campaign: any) =>
  campaign?.id ?? campaign?.campaign_id ?? campaign?.broadcast_uuid

const getCourseTitle = (course: any) =>
  course?.name ?? course?.title ?? course?.courseStructure?.name ?? ''

const getCourseDescription = (course: any) =>
  course?.description ??
  course?.about ??
  course?.courseStructure?.description ??
  ''

function parseEmails(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,; ]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function getCourseImage(course: any, orgUuid?: string) {
  const thumbnail =
    course?.thumbnail_image ?? course?.courseStructure?.thumbnail_image ?? ''
  const courseUuid = course?.course_uuid ?? course?.courseStructure?.course_uuid
  if (thumbnail && courseUuid && orgUuid && !thumbnail.startsWith('http')) {
    return getCourseThumbnailMediaDirectory(orgUuid, courseUuid, thumbnail)
  }
  return thumbnail
}

function normalizeList(value: any) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.campaigns)) return value.campaigns
  if (Array.isArray(value?.results)) return value.results
  return []
}

function campaignToForm(campaign: any, fallback: CampaignForm): CampaignForm {
  const targetType = (campaign?.target_type ||
    fallback.target_type) as CampaignTargetType
  const metadata = campaign?.target_metadata || {}
  return {
    ...fallback,
    id: getCampaignId(campaign),
    subject: campaign?.subject || '',
    preheader: campaign?.preheader || '',
    sender_name: campaign?.sender_name || '',
    reply_to_email: campaign?.reply_to_email || '',
    campaign_type: (campaign?.campaign_type ||
      campaign?.broadcast_type ||
      fallback.campaign_type) as CampaignForm['campaign_type'],
    target_type: targetType,
    target_course_uuid: metadata.course_uuid || '',
    target_roles: Array.isArray(metadata.roles) ? metadata.roles : [],
    custom_emails: Array.isArray(metadata.emails)
      ? metadata.emails.join('\n')
      : '',
    scheduled_at: campaign?.scheduled_at
      ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
      : '',
    sections: Array.isArray(campaign?.content_json?.sections)
      ? campaign.content_json.sections
      : fallback.sections,
  }
}

export default function CommunicationsPage({
  params,
}: {
  params: Promise<{ orgslug: string }>
}) {
  const { orgslug } = React.use(params)
  const org = useOrg() as any
  const session = useLHSession() as any
  const accessToken: string = session?.data?.tokens?.access_token ?? ''
  const currentUserEmail = session?.data?.user?.email ?? ''
  const { mutate } = useSWRConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>(
    'desktop'
  )
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [recipientStatus, setRecipientStatus] = useState('')
  const [form, setForm] = useState<CampaignForm>({
    ...blankForm,
    sender_name: org?.name || '',
    reply_to_email: currentUserEmail,
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      sender_name: current.sender_name || org?.name || '',
      reply_to_email: current.reply_to_email || currentUserEmail,
    }))
  }, [currentUserEmail, org?.name])

  const campaignsKey =
    orgslug && accessToken
      ? [`${orgslug}_marketing_campaigns`, accessToken]
      : null

  const { data: campaignsResponse = [], isLoading: loadingCampaigns } = useSWR(
    campaignsKey,
    () => getCampaigns(accessToken, orgslug)
  )
  const campaigns = normalizeList(campaignsResponse)

  const { data: coursesResponse = [] } = useSWR(
    org?.org_slug && accessToken
      ? [`${org.org_slug}_courses`, accessToken]
      : null,
    () => getOrgCourses(org?.org_slug, null, accessToken)
  )
  const courses = normalizeList(coursesResponse)

  const { data: liveSessions = [] } = useSWR(
    org?.org_slug && accessToken
      ? [`${org.org_slug}_sessions`, accessToken]
      : null,
    () => getLiveSessions(accessToken, org?.org_slug)
  )

  const { data: recipientsResponse = [], isLoading: loadingRecipients } =
    useSWR(
      selectedCampaignId && accessToken
        ? [
            `${orgslug}_campaign_recipients`,
            selectedCampaignId,
            recipientStatus,
            accessToken,
          ]
        : null,
      () =>
        getCampaignRecipients(
          selectedCampaignId,
          accessToken,
          orgslug,
          recipientStatus || undefined
        )
    )
  const recipients = normalizeList(recipientsResponse)

  const customEmails = useMemo(
    () => parseEmails(form.custom_emails),
    [form.custom_emails]
  )
  const invalidEmails = useMemo(
    () => customEmails.filter((email) => !emailRegex.test(email)),
    [customEmails]
  )

  const updateField = <K extends keyof CampaignForm>(
    field: K,
    value: CampaignForm[K]
  ) => setForm((current) => ({ ...current, [field]: value }))

  const updateSection = (index: number, next: CampaignSection) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? next : section
      ),
    }))
  }

  const addSection = (type: CampaignSection['type']) => {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, createSection(type)],
    }))
  }

  const removeSection = (index: number) => {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter(
        (_, sectionIndex) => sectionIndex !== index
      ),
    }))
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.sections.length) return current
      const sections = [...current.sections]
      const [section] = sections.splice(index, 1)
      sections.splice(nextIndex, 0, section)
      return { ...current, sections }
    })
  }

  const hydrateCourseSection = (index: number, courseUuid: string) => {
    const course = courses.find((item: any) => item.course_uuid === courseUuid)
    const current = form.sections[index]
    if (current.type !== 'course') return
    updateSection(index, {
      ...current,
      course_uuid: courseUuid,
      title: getCourseTitle(course) || current.title,
      description: getCourseDescription(course) || current.description,
      image_url: getCourseImage(course, org?.org_uuid) || current.image_url,
      cta_label: current.cta_label || 'View course',
      cta_url:
        current.cta_url || getUriWithOrg(orgslug, `/course/${courseUuid}`),
    })
  }

  const setUploadedImage = (url: string) => {
    if (uploadTarget === null) return
    const section = form.sections[uploadTarget]
    if (section?.type === 'header') {
      updateSection(uploadTarget, { ...section, image_url: url })
    }
    if (section?.type === 'course') {
      updateSection(uploadTarget, { ...section, image_url: url })
    }
    if (section?.type === 'image') {
      updateSection(uploadTarget, { ...section, image_url: url })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadCampaignImage(file, accessToken, orgslug)
      const contentUrl =
        result?.content_url ||
        (result?.filename && org?.org_uuid
          ? getCampaignMediaUrl(org.org_uuid, result.filename)
          : '')
      if (contentUrl) {
        setUploadedImage(contentUrl)
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const buildTargetMetadata = () => {
    if (form.target_type === 'COURSE')
      return { course_uuid: form.target_course_uuid }
    if (form.target_type === 'ROLES') return { roles: form.target_roles }
    if (form.target_type === 'CUSTOM_EMAILS') return { emails: customEmails }
    return {}
  }

  const buildPayload = (): CampaignPayload => ({
    subject: form.subject.trim(),
    preheader: form.preheader.trim(),
    sender_name: form.sender_name.trim(),
    reply_to_email: form.reply_to_email.trim(),
    campaign_type: form.campaign_type,
    target_type: form.target_type,
    target_metadata: buildTargetMetadata(),
    content_json: {
      sections: form.sections.filter((section) => {
        if (section.type === 'header') {
          return section.headline || section.body || section.image_url
        }
        if (section.type === 'text') return section.heading || section.body
        if (section.type === 'course') {
          return section.title || section.description || section.course_uuid
        }
        if (section.type === 'image') return section.image_url
        if (section.type === 'button') return section.label && section.url
        return section.closing_text || section.community_link
      }),
    },
    scheduled_at: form.scheduled_at
      ? new Date(form.scheduled_at).toISOString()
      : null,
  })

  const validatePayload = () => {
    if (!form.subject.trim()) return 'Add a subject before saving.'
    if (form.target_type === 'COURSE' && !form.target_course_uuid) {
      return 'Choose the target course audience.'
    }
    if (form.target_type === 'ROLES' && form.target_roles.length === 0) {
      return 'Choose at least one role.'
    }
    if (form.target_type === 'CUSTOM_EMAILS') {
      if (customEmails.length === 0) return 'Add at least one custom email.'
      if (customEmails.length > 500) {
        return 'Custom emails are limited to 500 recipients.'
      }
      if (invalidEmails.length > 0) {
        return `Invalid emails: ${invalidEmails.slice(0, 3).join(', ')}`
      }
    }
    if (buildPayload().content_json.sections.length === 0) {
      return 'Add at least one visible email section.'
    }
    return ''
  }

  const saveDraft = async () => {
    const validationError = validatePayload()
    if (validationError) {
      toast.error(validationError)
      return null
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      const saved = form.id
        ? await updateCampaign(form.id, payload, accessToken, orgslug)
        : await createCampaignDraft(payload, accessToken, orgslug)
      const savedId = getCampaignId(saved)
      if (savedId) setForm((current) => ({ ...current, id: savedId }))
      toast.success('Draft saved')
      mutate(campaignsKey)
      return savedId || form.id
    } catch {
      toast.error('Failed to save draft')
      return null
    } finally {
      setSaving(false)
    }
  }

  const sendNow = async () => {
    const campaignId = await saveDraft()
    if (!campaignId) return
    setSending(true)
    try {
      await sendCampaignNow(campaignId, accessToken, orgslug)
      toast.success('Campaign queued for dispatch')
      mutate(campaignsKey)
    } catch {
      toast.error('Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const cancelQueuedCampaign = async (campaignId: string | number) => {
    try {
      await cancelCampaign(campaignId, accessToken, orgslug)
      toast.success('Campaign cancelled')
      mutate(campaignsKey)
    } catch {
      toast.error('Failed to cancel campaign')
    }
  }

  const loadCampaignIntoComposer = async (campaign: any) => {
    const campaignId = getCampaignId(campaign)
    if (!campaignId) return
    try {
      const detail = await getCampaign(campaignId, accessToken, orgslug)
      setForm(
        campaignToForm(detail || campaign, {
          ...blankForm,
          sender_name: org?.name || '',
          reply_to_email: currentUserEmail,
        })
      )
      setSelectedCampaignId(String(campaignId))
      toast.success('Campaign loaded')
    } catch {
      setForm(
        campaignToForm(campaign, {
          ...blankForm,
          sender_name: org?.name || '',
          reply_to_email: currentUserEmail,
        })
      )
      setSelectedCampaignId(String(campaignId))
      toast.success('Campaign loaded from history')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f8f8] p-4 pb-24 dark:bg-[#0f0f13] md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
              <Megaphone className="text-zinc-400 dark:text-white/45" />
              Marketing Emails
            </h1>
            <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-white/50">
              Build structured course broadcasts, preview them, and queue
              delivery.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...blankForm,
                  sender_name: org?.name || '',
                  reply_to_email: currentUserEmail,
                })
              }
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-700 transition hover:border-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              <Plus size={14} /> New Draft
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-black disabled:opacity-50 dark:border-blue-600 dark:bg-blue-600"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save Draft
            </button>
            <button
              type="button"
              onClick={sendNow}
              disabled={sending || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send Now
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-6">
            <SettingsPanel
              form={form}
              orgName={org?.name}
              updateField={updateField}
            />
            <AudiencePanel
              form={form}
              courses={courses}
              customEmails={customEmails}
              invalidEmails={invalidEmails}
              updateField={updateField}
            />
            <SectionBuilder
              sections={form.sections}
              courses={courses}
              uploadTarget={uploadTarget}
              uploading={uploading}
              addSection={addSection}
              updateSection={updateSection}
              removeSection={removeSection}
              moveSection={moveSection}
              hydrateCourseSection={hydrateCourseSection}
              setUploadTarget={setUploadTarget}
              openFilePicker={() => fileInputRef.current?.click()}
            />
            {liveSessions.length > 0 && (
              <LiveSessions sessions={liveSessions} />
            )}
          </main>
          <aside className="space-y-6">
            <PreviewPanel
              form={form}
              orgName={org?.name}
              previewMode={previewMode}
              setPreviewMode={setPreviewMode}
              buildPayload={buildPayload}
            />
            <HistoryPanel
              campaigns={campaigns}
              loading={loadingCampaigns}
              selectedCampaignId={selectedCampaignId}
              selectCampaign={setSelectedCampaignId}
              loadCampaign={loadCampaignIntoComposer}
              cancelCampaign={cancelQueuedCampaign}
            />
            {selectedCampaignId && (
              <RecipientsPanel
                recipients={recipients}
                loading={loadingRecipients}
                status={recipientStatus}
                setStatus={setRecipientStatus}
              />
            )}
            <section className="rounded-lg bg-zinc-900 p-5 text-white shadow-sm dark:border dark:border-white/10">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                <AlertCircle size={16} /> Safety
              </div>
              <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-400">
                Marketing unsubscribe filtering happens on the backend,
                including for custom email lists.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({
  form,
  orgName,
  updateField,
}: {
  form: CampaignForm
  orgName?: string
  updateField: <K extends keyof CampaignForm>(
    field: K,
    value: CampaignForm[K]
  ) => void
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 pb-4 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:border-white/10 dark:text-white/40">
        <Mail size={16} /> Campaign Settings
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Campaign Type">
          <select
            value={form.campaign_type}
            onChange={(e) =>
              updateField(
                'campaign_type',
                e.target.value as CampaignForm['campaign_type']
              )
            }
            className={inputClass}
          >
            <option value="COURSE_MARKETING">Course Marketing</option>
            <option value="GENERAL">General</option>
          </select>
        </Field>
        <Field label="Subject">
          <input
            value={form.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            placeholder="New courses are open for enrollment"
            className={inputClass}
          />
        </Field>
        <Field label="Preheader">
          <input
            value={form.preheader}
            onChange={(e) => updateField('preheader', e.target.value)}
            placeholder="A short inbox preview for recipients"
            className={inputClass}
          />
        </Field>
        <Field label="Sender Name">
          <input
            value={form.sender_name}
            onChange={(e) => updateField('sender_name', e.target.value)}
            placeholder={orgName || 'Academy Team'}
            className={inputClass}
          />
        </Field>
        <Field label="Reply-To">
          <input
            value={form.reply_to_email}
            onChange={(e) => updateField('reply_to_email', e.target.value)}
            type="email"
            placeholder="team@example.com"
            className={inputClass}
          />
        </Field>
        <Field label="Schedule">
          <input
            value={form.scheduled_at}
            onChange={(e) => updateField('scheduled_at', e.target.value)}
            type="datetime-local"
            className={inputClass}
          />
        </Field>
      </div>
    </section>
  )
}

function AudiencePanel({
  form,
  courses,
  customEmails,
  invalidEmails,
  updateField,
}: {
  form: CampaignForm
  courses: any[]
  customEmails: string[]
  invalidEmails: string[]
  updateField: <K extends keyof CampaignForm>(
    field: K,
    value: CampaignForm[K]
  ) => void
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-5 flex items-center gap-2 border-b border-zinc-100 pb-4 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:border-white/10 dark:text-white/40">
        <Users size={16} /> Audience
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Target Audience">
          <select
            value={form.target_type}
            onChange={(e) =>
              updateField('target_type', e.target.value as CampaignTargetType)
            }
            className={inputClass}
          >
            <option value="ALL">All active users</option>
            <option value="WAITLIST">Waitlist users</option>
            <option value="COURSE">Course enrollment</option>
            <option value="ROLES">Roles</option>
            <option value="CUSTOM_EMAILS">Custom emails</option>
          </select>
        </Field>
        {form.target_type === 'COURSE' && (
          <Field label="Audience Course">
            <select
              value={form.target_course_uuid}
              onChange={(e) =>
                updateField('target_course_uuid', e.target.value)
              }
              className={inputClass}
            >
              <option value="">Select a course</option>
              {courses.map((course: any) => (
                <option
                  key={course.course_uuid || course.id}
                  value={course.course_uuid}
                >
                  {getCourseTitle(course)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {form.target_type === 'ROLES' && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {roleOptions.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-bold capitalize text-zinc-600 dark:border-white/10 dark:text-white/60"
            >
              <input
                type="checkbox"
                checked={form.target_roles.includes(role)}
                onChange={(e) => {
                  const roles = e.target.checked
                    ? [...form.target_roles, role]
                    : form.target_roles.filter((item) => item !== role)
                  updateField('target_roles', roles)
                }}
              />
              {role.replaceAll('_', ' ')}
            </label>
          ))}
        </div>
      )}
      {form.target_type === 'CUSTOM_EMAILS' && (
        <div className="mt-4">
          <Field label="Custom Emails">
            <textarea
              value={form.custom_emails}
              onChange={(e) => updateField('custom_emails', e.target.value)}
              rows={5}
              placeholder="student@example.com, learner@example.com"
              className={inputClass}
            />
          </Field>
          <p className="mt-2 text-xs font-semibold text-zinc-400 dark:text-white/35">
            {customEmails.length} unique recipients.{' '}
            {invalidEmails.length > 0
              ? `${invalidEmails.length} invalid.`
              : 'All valid so far.'}
          </p>
        </div>
      )}
    </section>
  )
}

function SectionBuilder({
  sections,
  courses,
  uploadTarget,
  uploading,
  addSection,
  updateSection,
  removeSection,
  moveSection,
  hydrateCourseSection,
  setUploadTarget,
  openFilePicker,
}: {
  sections: CampaignSection[]
  courses: any[]
  uploadTarget: number | null
  uploading: boolean
  addSection: (type: CampaignSection['type']) => void
  updateSection: (index: number, section: CampaignSection) => void
  removeSection: (index: number) => void
  moveSection: (index: number, direction: -1 | 1) => void
  hydrateCourseSection: (index: number, courseUuid: string) => void
  setUploadTarget: (index: number) => void
  openFilePicker: () => void
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-5 flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
          <Copy size={16} /> Section Builder
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionTypes.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addSection(item.type)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-zinc-600 transition hover:border-zinc-400 dark:border-white/10 dark:text-white/60"
            >
              <Plus size={12} /> {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {sections.map((section, index) => (
          <SectionEditor
            key={`${section.type}-${index}`}
            section={section}
            index={index}
            courses={courses}
            uploading={uploading && uploadTarget === index}
            onChange={(next) => updateSection(index, next)}
            onRemove={() => removeSection(index)}
            onMove={(direction) => moveSection(index, direction)}
            onCoursePick={(courseUuid) =>
              hydrateCourseSection(index, courseUuid)
            }
            onUpload={() => {
              setUploadTarget(index)
              openFilePicker()
            }}
          />
        ))}
      </div>
    </section>
  )
}

function SectionEditor({
  section,
  index,
  courses,
  uploading,
  onChange,
  onRemove,
  onMove,
  onCoursePick,
  onUpload,
}: {
  section: CampaignSection
  index: number
  courses: any[]
  uploading: boolean
  onChange: (section: CampaignSection) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
  onCoursePick: (courseUuid: string) => void
  onUpload: () => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-white/80">
          {index + 1}. {getSectionTitle(section)}
        </h3>
        <div className="flex items-center gap-1">
          <IconButton
            label="Move up"
            onClick={() => onMove(-1)}
            icon={<ArrowUp size={14} />}
          />
          <IconButton
            label="Move down"
            onClick={() => onMove(1)}
            icon={<ArrowDown size={14} />}
          />
          <IconButton
            label="Remove"
            onClick={onRemove}
            icon={<Trash2 size={14} />}
            danger
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {section.type === 'header' && (
          <>
            <Field label="Headline">
              <input
                value={section.headline}
                onChange={(e) =>
                  onChange({ ...section, headline: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <ImageUrlField
              section={section}
              onChange={onChange}
              onUpload={onUpload}
              uploading={uploading}
            />
            <div className="md:col-span-2">
              <Field label="Body">
                <textarea
                  value={section.body}
                  onChange={(e) =>
                    onChange({ ...section, body: e.target.value })
                  }
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
          </>
        )}
        {section.type === 'text' && (
          <>
            <Field label="Heading">
              <input
                value={section.heading || ''}
                onChange={(e) =>
                  onChange({ ...section, heading: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Body">
                <textarea
                  value={section.body}
                  onChange={(e) =>
                    onChange({ ...section, body: e.target.value })
                  }
                  rows={4}
                  className={inputClass}
                />
              </Field>
            </div>
          </>
        )}
        {section.type === 'course' && (
          <>
            <Field label="Course Picker">
              <select
                value={section.course_uuid}
                onChange={(e) => onCoursePick(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a course</option>
                {courses.map((course: any) => (
                  <option
                    key={course.course_uuid || course.id}
                    value={course.course_uuid}
                  >
                    {getCourseTitle(course)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title">
              <input
                value={section.title}
                onChange={(e) =>
                  onChange({ ...section, title: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea
                  value={section.description}
                  onChange={(e) =>
                    onChange({ ...section, description: e.target.value })
                  }
                  rows={3}
                  className={inputClass}
                />
              </Field>
            </div>
            <ImageUrlField
              section={section}
              onChange={onChange}
              onUpload={onUpload}
              uploading={uploading}
            />
            <Field label="CTA Label">
              <input
                value={section.cta_label}
                onChange={(e) =>
                  onChange({ ...section, cta_label: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="CTA URL">
                <input
                  value={section.cta_url}
                  onChange={(e) =>
                    onChange({ ...section, cta_url: e.target.value })
                  }
                  type="url"
                  className={inputClass}
                />
              </Field>
            </div>
          </>
        )}
        {section.type === 'image' && (
          <>
            <ImageUrlField
              section={section}
              onChange={onChange}
              onUpload={onUpload}
              uploading={uploading}
            />
            <Field label="Alt Text">
              <input
                value={section.alt_text}
                onChange={(e) =>
                  onChange({ ...section, alt_text: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </>
        )}
        {section.type === 'button' && (
          <>
            <Field label="Label">
              <input
                value={section.label}
                onChange={(e) =>
                  onChange({ ...section, label: e.target.value })
                }
                className={inputClass}
              />
            </Field>
            <Field label="URL">
              <input
                value={section.url}
                onChange={(e) => onChange({ ...section, url: e.target.value })}
                type="url"
                className={inputClass}
              />
            </Field>
          </>
        )}
        {section.type === 'footer' && (
          <>
            <Field label="Closing Text">
              <textarea
                value={section.closing_text}
                onChange={(e) =>
                  onChange({ ...section, closing_text: e.target.value })
                }
                rows={3}
                className={inputClass}
              />
            </Field>
            <Field label="Community Link">
              <input
                value={section.community_link || ''}
                onChange={(e) =>
                  onChange({ ...section, community_link: e.target.value })
                }
                type="url"
                className={inputClass}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

function ImageUrlField({
  section,
  onChange,
  onUpload,
  uploading,
}: {
  section: Extract<CampaignSection, { type: 'header' | 'course' | 'image' }>
  onChange: (section: CampaignSection) => void
  onUpload: () => void
  uploading: boolean
}) {
  return (
    <Field label="Image URL">
      <div className="flex gap-2">
        <input
          value={section.image_url || ''}
          onChange={(e) =>
            onChange({
              ...section,
              image_url: e.target.value,
            } as CampaignSection)
          }
          type="url"
          className={inputClass}
        />
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-zinc-400 dark:border-white/10 dark:text-white/55"
          aria-label="Upload image"
        >
          {uploading ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Upload size={17} />
          )}
        </button>
      </div>
    </Field>
  )
}

function PreviewPanel({
  form,
  orgName,
  previewMode,
  setPreviewMode,
  buildPayload,
}: {
  form: CampaignForm
  orgName?: string
  previewMode: 'desktop' | 'mobile'
  setPreviewMode: (mode: 'desktop' | 'mobile') => void
  buildPayload: () => CampaignPayload
}) {
  return (
    <section className="sticky top-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
          <Eye size={16} /> Preview
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-1 dark:border-white/10">
          {(['desktop', 'mobile'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPreviewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                previewMode === mode
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'text-zinc-500 dark:text-white/45'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 rounded-lg bg-zinc-50 p-3 dark:bg-white/5">
        <p className="truncate text-sm font-black text-zinc-900 dark:text-white">
          {form.subject || 'Campaign subject'}
        </p>
        <p className="truncate text-xs font-medium text-zinc-500 dark:text-white/45">
          {form.preheader || 'Preheader preview'}
        </p>
      </div>
      <div className="flex justify-center overflow-auto rounded-lg bg-zinc-100 p-3 dark:bg-black/25">
        <iframe
          title="Marketing email preview"
          srcDoc={renderPreviewHtml(buildPayload(), orgName)}
          className="h-[640px] rounded-md border border-zinc-200 bg-white dark:border-white/10"
          style={{ width: previewMode === 'mobile' ? 360 : 600 }}
        />
      </div>
    </section>
  )
}

function HistoryPanel({
  campaigns,
  loading,
  selectedCampaignId,
  selectCampaign,
  loadCampaign,
  cancelCampaign,
}: {
  campaigns: any[]
  loading: boolean
  selectedCampaignId: string
  selectCampaign: (id: string) => void
  loadCampaign: (campaign: any) => void
  cancelCampaign: (id: string | number) => void
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
        <History size={16} /> Campaign History
      </div>
      {loading ? (
        <BarLoader width={120} color="#d4d4d8" />
      ) : campaigns.length === 0 ? (
        <div className="py-10 text-center text-zinc-300 dark:text-white/20">
          <Mail size={36} className="mx-auto" />
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest">
            No campaigns yet
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {campaigns.map((campaign: any) => {
            const campaignId = getCampaignId(campaign)
            const selected = selectedCampaignId === String(campaignId)
            const canCancel = ['DRAFT', 'QUEUED', 'PROCESSING'].includes(
              campaign.status
            )
            return (
              <div
                key={campaignId}
                className={`rounded-lg border p-3 ${
                  selected
                    ? 'border-zinc-900 dark:border-white/50'
                    : 'border-zinc-200 dark:border-white/10'
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectCampaign(String(campaignId))}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-md bg-zinc-100 px-2 py-1 text-[9px] font-black uppercase text-zinc-500 dark:bg-white/10 dark:text-white/45">
                      {campaign.status || 'DRAFT'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">
                      {formatDate(
                        campaign.creation_date || campaign.created_at
                      )}
                    </span>
                  </div>
                  <h4 className="mt-2 truncate text-sm font-black text-zinc-900 dark:text-white/90">
                    {campaign.subject}
                  </h4>
                  <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {campaign.campaign_type ||
                      campaign.broadcast_type ||
                      'GENERAL'}
                  </p>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-zinc-500 dark:text-white/45">
                    <Metric label="Total" value={campaign.total_recipients} />
                    <Metric label="Sent" value={campaign.sent_count} />
                    <Metric label="Failed" value={campaign.failed_count} />
                    <Metric label="Skipped" value={campaign.skipped_count} />
                  </div>
                </button>
                {canCancel && campaignId && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => loadCampaign(campaign)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-white/45"
                    >
                      <Copy size={12} /> Load
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelCampaign(campaignId)}
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-500"
                    >
                      <X size={12} /> Cancel
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RecipientsPanel({
  recipients,
  loading,
  status,
  setStatus,
}: {
  recipients: any[]
  loading: boolean
  status: string
  setStatus: (value: string) => void
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
          Recipients
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <option value="">All</option>
          <option value="SENT">Sent</option>
          <option value="FAILED_PERMANENT">Failed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="SKIPPED">Skipped</option>
        </select>
      </div>
      {loading ? (
        <BarLoader width={100} color="#d4d4d8" />
      ) : recipients.length === 0 ? (
        <p className="text-xs font-semibold text-zinc-400">
          No recipient rows returned.
        </p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-2">Email</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
              {recipients.map((recipient: any) => (
                <tr key={recipient.id || recipient.email}>
                  <td className="max-w-[150px] truncate py-2 font-bold text-zinc-700 dark:text-white/75">
                    {recipient.email}
                  </td>
                  <td className="text-zinc-500">{recipient.status}</td>
                  <td className="max-w-[130px] truncate text-zinc-400">
                    {recipient.skip_reason || recipient.last_error || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function LiveSessions({ sessions }: { sessions: any[] }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#13131a]">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40">
        <Video size={16} /> Live Session Participants
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sessions.map((session: any) => (
          <Link
            key={session.id}
            href={`/dash/communications/participants/${session.activity_uuid}`}
            className="rounded-lg border border-zinc-200 p-4 transition hover:border-zinc-400 dark:border-white/10 dark:hover:border-white/25"
          >
            <h4 className="truncate text-sm font-black text-zinc-900 dark:text-white/90">
              {session.name}
            </h4>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
              {session.course_name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value }: { label: string; value: any }) {
  return (
    <span className="rounded-md bg-zinc-50 px-2 py-1 dark:bg-white/5">
      {label}: {Number(value || 0)}
    </span>
  )
}

function IconButton({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        danger
          ? 'border-red-100 text-red-500 hover:bg-red-50 dark:border-red-400/20 dark:hover:bg-red-500/10'
          : 'border-zinc-200 text-zinc-500 hover:border-zinc-400 dark:border-white/10 dark:text-white/55'
      }`}
    >
      {icon}
    </button>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function escapeHtml(value?: string) {
  // nosemgrep: javascript.audit.detect-replaceall-sanitization.detect-replaceall-sanitization
  return (value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function paragraph(value?: string) {
  return escapeHtml(value).replaceAll('\n', '<br />')
}

function renderPreviewHtml(payload: CampaignPayload, orgName?: string) {
  const sections = payload.content_json.sections
    .map((section) => {
      if (section.type === 'header') {
        return `
          ${section.image_url ? `<img src="${escapeHtml(section.image_url)}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:8px;margin-bottom:24px;" />` : ''}
          <h1 style="font-size:28px;line-height:1.15;margin:0 0 12px;color:#18181b;">${escapeHtml(section.headline)}</h1>
          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#52525b;">${paragraph(section.body)}</p>
        `
      }
      if (section.type === 'text') {
        return `
          <div style="margin:24px 0;">
            ${section.heading ? `<h2 style="font-size:20px;margin:0 0 8px;color:#18181b;">${escapeHtml(section.heading)}</h2>` : ''}
            <p style="font-size:15px;line-height:1.7;margin:0;color:#52525b;">${paragraph(section.body)}</p>
          </div>
        `
      }
      if (section.type === 'course') {
        return `
          <div style="border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;margin:24px 0;">
            ${section.image_url ? `<img src="${escapeHtml(section.image_url)}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;" />` : ''}
            <div style="padding:22px;">
              <h2 style="font-size:22px;margin:0 0 10px;color:#18181b;">${escapeHtml(section.title)}</h2>
              <p style="font-size:14px;line-height:1.7;margin:0 0 18px;color:#52525b;">${paragraph(section.description)}</p>
              ${section.cta_url ? `<a href="${escapeHtml(section.cta_url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:800;font-size:13px;">${escapeHtml(section.cta_label || 'View course')}</a>` : ''}
            </div>
          </div>
        `
      }
      if (section.type === 'image') {
        return `<img src="${escapeHtml(section.image_url)}" alt="${escapeHtml(section.alt_text)}" style="width:100%;border-radius:8px;margin:20px 0;" />`
      }
      if (section.type === 'button') {
        return `<p style="text-align:center;margin:28px 0;"><a href="${escapeHtml(section.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;padding:13px 22px;font-weight:800;font-size:14px;">${escapeHtml(section.label)}</a></p>`
      }
      return `
        <div style="border-top:1px solid #e4e4e7;margin-top:28px;padding-top:22px;">
          <p style="font-size:14px;line-height:1.7;margin:0 0 12px;color:#52525b;">${paragraph(section.closing_text)}</p>
          ${section.community_link ? `<a href="${escapeHtml(section.community_link)}" style="color:#2563eb;font-weight:800;text-decoration:none;">Join our community</a>` : ''}
        </div>
      `
    })
    .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>body{margin:0;background:#f4f4f5;font-family:Arial,sans-serif;}</style>
      </head>
      <body>
        <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(payload.preheader)}</div>
        <main style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px;">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#71717a;margin-bottom:24px;">${escapeHtml(orgName || payload.sender_name || 'Academy')}</div>
          ${sections || '<p style="color:#71717a;">Add sections to preview the campaign.</p>'}
          <p style="border-top:1px solid #e4e4e7;margin-top:28px;padding-top:18px;font-size:11px;line-height:1.6;color:#a1a1aa;">You are receiving this marketing email from ${escapeHtml(orgName || 'this organization')}. An unsubscribe link will be included when sent.</p>
        </main>
      </body>
    </html>
  `
}
