'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useCourse } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  CalendarDays,
  Clock3,
  CopyCheck,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  Video,
} from 'lucide-react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import {
  CourseRegisterPolicy,
  CourseTimetableEvent,
  CourseTimetableEventInput,
  RegisterFrequency,
  TimetableRecurrence,
  TimetableVisibility,
  createCourseTimetableEvent,
  deleteCourseTimetableEvent,
  getCourseRegisterPolicy,
  getCourseTimetable,
  getMockRegisterPolicy,
  getMockTimetable,
  updateCourseRegisterPolicy,
  updateCourseTimetableEvent,
} from '@services/courses/schedule'
import { Switch } from '@components/ui/switch'

const recurrenceOptions: { value: TimetableRecurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'weekly', label: 'Repeat weekly' },
  { value: 'biweekly', label: 'Repeat every 2 weeks' },
  { value: 'monthly', label: 'Repeat monthly' },
]

const frequencyOptions: { value: RegisterFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'per_session', label: 'Per session' },
  { value: 'daily', label: 'Daily' },
  { value: 'manual', label: 'Instructor opens manually' },
]

function EditCourseSchedule() {
  const course = useCourse() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const courseStructure = course?.courseStructure
  const courseUuid = courseStructure?.course_uuid

  const {
    data: timetableData,
    error: timetableError,
    mutate: mutateTimetable,
  } = useSWR(
    courseUuid ? ['course-timetable', courseUuid] : null,
    () => getCourseTimetable(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const {
    data: policyData,
    error: policyError,
    mutate: mutatePolicy,
  } = useSWR(
    courseUuid ? ['course-register-policy', courseUuid] : null,
    () => getCourseRegisterPolicy(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const initialEvents = useMemo(
    () =>
      timetableData ||
      (timetableError && courseUuid ? getMockTimetable(courseUuid) : []),
    [courseUuid, timetableData, timetableError]
  )
  const initialPolicy = useMemo(
    () =>
      policyData ||
      (policyError && courseUuid ? getMockRegisterPolicy(courseUuid) : null),
    [courseUuid, policyData, policyError]
  )

  const [events, setEvents] = useState<CourseTimetableEvent[]>([])
  const [selectedEventUuid, setSelectedEventUuid] = useState<string | null>(
    null
  )
  const [draft, setDraft] = useState<CourseTimetableEventInput | null>(null)
  const [policy, setPolicy] = useState<CourseRegisterPolicy | null>(null)
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)

  useEffect(() => {
    setEvents(initialEvents)
    if (!selectedEventUuid && initialEvents.length > 0) {
      const first = initialEvents[0]
      setSelectedEventUuid(first.event_uuid)
      setDraft(toDraft(first))
    }
  }, [initialEvents, selectedEventUuid])

  useEffect(() => {
    if (initialPolicy) {
      setPolicy(initialPolicy)
    }
  }, [initialPolicy])

  const selectedEvent = events.find(
    (event) => event.event_uuid === selectedEventUuid
  )

  const selectEvent = (event: CourseTimetableEvent) => {
    setSelectedEventUuid(event.event_uuid)
    setDraft(toDraft(event))
  }

  const createLocalEvent = () => {
    if (!courseUuid) return
    const next = createBlankEvent(courseUuid)
    setEvents((current) => [next, ...current])
    setSelectedEventUuid(next.event_uuid)
    setDraft(toDraft(next))
  }

  const saveEvent = async () => {
    if (!courseUuid || !draft) return
    setIsSavingEvent(true)
    const isLocalOnly = selectedEventUuid?.startsWith('local_')
    try {
      const result =
        selectedEventUuid && !isLocalOnly
          ? await updateCourseTimetableEvent(
              courseUuid,
              selectedEventUuid,
              draft,
              accessToken
            )
          : await createCourseTimetableEvent(courseUuid, draft, accessToken)

      if (!result.success) {
        throw new Error(result.HTTPmessage)
      }

      toast.success('Schedule saved')
      mutateTimetable()
    } catch {
      const localUuid = selectedEventUuid || `local_${Date.now()}`
      setEvents((current) =>
        current.map((event) =>
          event.event_uuid === selectedEventUuid
            ? {
                ...event,
                ...draft,
                event_uuid: localUuid,
                course_uuid: courseUuid,
              }
            : event
        )
      )
      setSelectedEventUuid(localUuid)
      toast('Backend endpoint not connected yet. Preview changes kept locally.')
    } finally {
      setIsSavingEvent(false)
    }
  }

  const removeEvent = async () => {
    if (!courseUuid || !selectedEventUuid) return
    const uuidToRemove = selectedEventUuid
    setEvents((current) =>
      current.filter((event) => event.event_uuid !== uuidToRemove)
    )
    setSelectedEventUuid(null)
    setDraft(null)

    if (uuidToRemove.startsWith('local_') || uuidToRemove.startsWith('mock_')) {
      return
    }

    const result = await deleteCourseTimetableEvent(
      courseUuid,
      uuidToRemove,
      accessToken
    )
    if (result.success) {
      toast.success('Session deleted')
      mutateTimetable()
    } else {
      toast.error('Could not delete session')
    }
  }

  const savePolicy = async () => {
    if (!courseUuid || !policy) return
    setIsSavingPolicy(true)
    try {
      const result = await updateCourseRegisterPolicy(
        courseUuid,
        policy,
        accessToken
      )
      if (!result.success) {
        throw new Error(result.HTTPmessage)
      }
      toast.success('Register policy saved')
      mutatePolicy()
    } catch {
      toast('Backend endpoint not connected yet. Policy preview kept locally.')
    } finally {
      setIsSavingPolicy(false)
    }
  }

  if (!courseUuid) {
    return <div className="p-10 text-sm text-gray-500">Loading schedule...</div>
  }

  return (
    <div>
      <div className="h-6"></div>
      <div className="mx-4 rounded-xl bg-white px-4 py-4 shadow-xs sm:mx-10">
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-gray-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-col -space-y-1">
            <h1 className="text-lg font-bold text-gray-800 sm:text-xl">
              Schedule
            </h1>
            <h2 className="text-xs text-gray-500 sm:text-sm">
              Manage the dynamic timetable and student register settings for
              this course.
            </h2>
          </div>
          <button
            type="button"
            onClick={createLocalEvent}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Plus size={16} />
            Add session
          </button>
        </div>

        {(timetableError || policyError) && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Backend schedule endpoints are not available yet, so this page is
            showing editable preview data against the planned API contract.
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <h2 className="font-bold text-gray-950">Timetable</h2>
                  <p className="text-xs text-gray-500">
                    Published sessions are visible to students.
                  </p>
                </div>
                <CalendarDays size={20} className="text-gray-400" />
              </div>

              <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {['Monday', 'Wednesday', 'Friday'].map((day) => (
                  <DayColumn
                    key={day}
                    day={day}
                    events={events.filter((event) => eventDay(event) === day)}
                    selectedEventUuid={selectedEventUuid}
                    onSelect={selectEvent}
                  />
                ))}
              </div>
            </div>

            <RegisterPolicyEditor
              policy={policy}
              setPolicy={setPolicy}
              isSaving={isSavingPolicy}
              onSave={savePolicy}
            />
          </section>

          <aside className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="font-bold text-gray-950">Session editor</h2>
                <p className="text-xs text-gray-500">
                  Update the class details students will see.
                </p>
              </div>
              <Clock3 size={20} className="text-gray-400" />
            </div>

            {draft ? (
              <div className="space-y-4 p-4">
                <TextField
                  label="Title"
                  value={draft.title}
                  onChange={(value) => setDraft({ ...draft, title: value })}
                />
                <TextField
                  label="Instructor"
                  value={draft.instructor_name || ''}
                  onChange={(value) =>
                    setDraft({ ...draft, instructor_name: value })
                  }
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextField
                    label="Starts"
                    type="datetime-local"
                    value={toDateTimeLocal(draft.starts_at)}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        starts_at: new Date(value).toISOString(),
                      })
                    }
                  />
                  <TextField
                    label="Ends"
                    type="datetime-local"
                    value={toDateTimeLocal(draft.ends_at)}
                    onChange={(value) =>
                      setDraft({
                        ...draft,
                        ends_at: new Date(value).toISOString(),
                      })
                    }
                  />
                </div>
                <TextField
                  label="Location or link"
                  value={draft.location || ''}
                  onChange={(value) => setDraft({ ...draft, location: value })}
                />
                <SelectField
                  label="Repeat"
                  value={draft.recurrence}
                  options={recurrenceOptions}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      recurrence: value as TimetableRecurrence,
                    })
                  }
                />
                <SelectField
                  label="Visibility"
                  value={draft.visibility}
                  options={[
                    { value: 'published', label: 'Published' },
                    { value: 'draft', label: 'Draft' },
                  ]}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      visibility: value as TimetableVisibility,
                    })
                  }
                />
                <ToggleRow
                  title="Require register"
                  description="Students can mark attendance for this session."
                  checked={draft.register_required}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, register_required: checked })
                  }
                />
                <label className="block">
                  <span className="text-xs font-bold text-gray-600">
                    Description
                  </span>
                  <textarea
                    value={draft.description || ''}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    className="mt-1 min-h-[92px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Add context for students"
                  />
                </label>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveEvent}
                    disabled={isSavingEvent}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save size={16} />
                    {isSavingEvent ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={removeEvent}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                <CalendarDays size={40} className="mb-3 text-gray-300" />
                <h3 className="font-semibold text-gray-800">
                  No session selected
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Pick a timetable item or create a new session.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function DayColumn({
  day,
  events,
  selectedEventUuid,
  onSelect,
}: {
  day: string
  events: CourseTimetableEvent[]
  selectedEventUuid: string | null
  onSelect: (event: CourseTimetableEvent) => void
}) {
  return (
    <div className="min-h-[280px] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">{day}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {events.length}
        </span>
      </div>
      <div className="space-y-3">
        {events.map((event) => {
          const isSelected = event.event_uuid === selectedEventUuid
          return (
            <button
              key={event.event_uuid}
              type="button"
              onClick={() => onSelect(event)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? 'border-blue-300 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-950">
                    {event.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-500">
                    <Clock3 size={13} />
                    {formatTimeRange(event.starts_at, event.ends_at)}
                  </p>
                </div>
                {event.register_required && (
                  <CopyCheck size={16} className="text-emerald-600" />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                {event.location && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1">
                    {event.location.toLowerCase().includes('zoom') ||
                    event.location.toLowerCase().includes('online') ? (
                      <Video size={12} />
                    ) : (
                      <MapPin size={12} />
                    )}
                    {event.location}
                  </span>
                )}
                <span className="rounded-md bg-gray-100 px-2 py-1 capitalize">
                  {event.recurrence}
                </span>
              </div>
            </button>
          )
        })}
        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            No sessions
          </div>
        )}
      </div>
    </div>
  )
}

function RegisterPolicyEditor({
  policy,
  setPolicy,
  isSaving,
  onSave,
}: {
  policy: CourseRegisterPolicy | null
  setPolicy: (policy: CourseRegisterPolicy) => void
  isSaving: boolean
  onSave: () => void
}) {
  if (!policy) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        Loading register policy...
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="font-bold text-gray-950">Register policy</h2>
          <p className="text-xs text-gray-500">
            Control how often students can mark their register.
          </p>
        </div>
        <Users size={20} className="text-gray-400" />
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-4">
        <ToggleRow
          title="Enable register"
          description="Allow attendance tracking for this course."
          checked={policy.enabled}
          onCheckedChange={(checked) =>
            setPolicy({ ...policy, enabled: checked })
          }
        />
        <SelectField
          label="Frequency"
          value={policy.frequency}
          options={frequencyOptions}
          onChange={(value) =>
            setPolicy({ ...policy, frequency: value as RegisterFrequency })
          }
        />
        <TextField
          label="Opens before"
          type="number"
          value={String(policy.checkin_opens_minutes_before)}
          suffix="min"
          onChange={(value) =>
            setPolicy({
              ...policy,
              checkin_opens_minutes_before: Number(value),
            })
          }
        />
        <TextField
          label="Closes after"
          type="number"
          value={String(policy.checkin_closes_minutes_after)}
          suffix="min"
          onChange={(value) =>
            setPolicy({
              ...policy,
              checkin_closes_minutes_after: Number(value),
            })
          }
        />
        <ToggleRow
          title="Requires enrollment"
          description="Only enrolled students can mark."
          checked={policy.requires_enrollment}
          onCheckedChange={(checked) =>
            setPolicy({ ...policy, requires_enrollment: checked })
          }
        />
        <ToggleRow
          title="Allow late marks"
          description="Mark after the window as late."
          checked={policy.allow_late}
          onCheckedChange={(checked) =>
            setPolicy({ ...policy, allow_late: checked })
          }
        />
        <div className="flex items-end lg:col-span-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save policy'}
          </button>
        </div>
      </div>
    </section>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  suffix,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      <div className="relative mt-1">
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function toDraft(event: CourseTimetableEvent): CourseTimetableEventInput {
  return {
    title: event.title,
    description: event.description || '',
    instructor_name: event.instructor_name || '',
    location: event.location || '',
    meeting_url: event.meeting_url || '',
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    timezone: event.timezone,
    recurrence: event.recurrence,
    visibility: event.visibility,
    status: event.status,
    register_required: event.register_required,
  }
}

function createBlankEvent(courseUuid: string): CourseTimetableEvent {
  const startsAt = new Date()
  startsAt.setDate(startsAt.getDate() + 1)
  startsAt.setHours(9, 0, 0, 0)
  const endsAt = new Date(startsAt)
  endsAt.setHours(10, 0, 0, 0)

  return {
    event_uuid: `local_${Date.now()}`,
    course_uuid: courseUuid,
    title: 'New class session',
    description: '',
    instructor_name: '',
    location: '',
    meeting_url: '',
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    recurrence: 'weekly',
    visibility: 'draft',
    status: 'scheduled',
    register_required: true,
  }
}

function eventDay(event: CourseTimetableEvent) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    new Date(event.starts_at)
  )
}

function formatTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(new Date(startsAt))} - ${formatter.format(
    new Date(endsAt)
  )}`
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export default EditCourseSchedule
