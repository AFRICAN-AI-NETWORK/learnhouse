'use client'

import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import {
  getMyTimetable,
  StudentTimetableEvent,
} from '@services/courses/schedule'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock3,
  Copy,
  CopyCheck,
  ExternalLink,
  MapPin,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { getOrgCourses } from '@services/courses/courses'
import { getAssignmentsFromACourse } from '@services/courses/assignments'

const weekDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function CalendarClient({ orgslug }: { orgslug: string }) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [now] = useState(() => Date.now())

  const {
    data: events,
    error,
    isLoading,
  } = useSWR(
    org?.id ? ['student-calendar', org.id] : null,
    () => getMyTimetable(org.id, accessToken),
    { shouldRetryOnError: false }
  )

  const { data: courses = [] } = useSWR(
    orgslug ? ['calendar-courses', orgslug] : null,
    () => getOrgCourses(orgslug, null, accessToken),
    { shouldRetryOnError: false }
  )

  const { data: courseAssignmentsData } = useSWR(
    courses?.length
      ? [
          'calendar-assignments',
          courses.map((course: any) => course.course_uuid).join(','),
        ]
      : null,
    async () => {
      const rows = await Promise.all(
        courses.map(async (course: any) => {
          const result = await getAssignmentsFromACourse(
            course.course_uuid,
            accessToken
          )
          return (result.success ? result.data : []).map((assignment: any) => ({
            ...assignment,
            course_uuid: course.course_uuid,
            course_name: course.name,
          }))
        })
      )
      return rows.flat()
    },
    { shouldRetryOnError: false }
  )

  const calendarEvents = useMemo(() => events || [], [events])
  const courseAssignments = useMemo(
    () => courseAssignmentsData || [],
    [courseAssignmentsData]
  )
  const upcomingEvents = [...calendarEvents]
    .filter((event) => new Date(event.ends_at).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  const nextEvent = upcomingEvents[0]
  const weekBlocks = useMemo(
    () => buildWeekBlocks(calendarEvents, courseAssignments, orgslug),
    [calendarEvents, courseAssignments, orgslug]
  )

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <GeneralWrapperStyled>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <Link
                href={getUriWithOrg(orgslug, '/')}
                className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft size={16} />
                Back to home
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-gray-950">Calendar</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Your LMS week view across calendar, modules, community and
                    assessments.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-3">
              <Metric label="Blocks" value={weekBlocks.length} />
              <Metric
                label="Courses"
                value={
                  new Set(calendarEvents.map((event) => event.course_uuid)).size
                }
              />
              <Metric
                label="Registers"
                value={
                  calendarEvents.filter((event) => event.register_required)
                    .length
                }
              />
            </div>
          </div>

          {nextEvent && (
            <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-bold uppercase text-blue-500">
                Next session
              </p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-blue-950">
                    {nextEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-blue-700">
                    {nextEvent.course_name} -{' '}
                    {formatDateTime(nextEvent.starts_at)}
                  </p>
                </div>
                {nextEvent.register_required && (
                  <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                    <CopyCheck size={14} />
                    Register required
                  </span>
                )}
              </div>
            </section>
          )}

          {isLoading && (
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not load your calendar. Please try again.
            </div>
          )}

          {!isLoading && !error && (
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="font-bold text-gray-950">Unified week view</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Calendar sessions, LMS modules and pending assignments in one
                  rhythm.
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {weekDays.map((day) => (
                  <CalendarDayRow
                    key={day}
                    day={day}
                    blocks={weekBlocks.filter(
                      (block) => eventDay(block.starts_at) === day
                    )}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </GeneralWrapperStyled>
    </main>
  )
}

function CalendarDayRow({
  day,
  blocks,
}: {
  day: string
  blocks: CalendarBlock[]
}) {
  const sortedEvents = [...blocks].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  return (
    <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[160px_minmax(0,1fr)]">
      <div className="flex items-center justify-between gap-2 lg:items-start">
        <h3 className="text-sm font-bold text-gray-800">{day}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {blocks.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sortedEvents.map((event) => (
          <CalendarEventCard key={event.id} event={event} />
        ))}
        {blocks.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            No blocks
          </div>
        )}
      </div>
    </div>
  )
}

type CalendarBlock = {
  id: string
  kind: 'session' | 'assignment' | 'module'
  title: string
  course_name: string
  course_uuid: string
  starts_at: string
  ends_at: string
  href?: string
  register_required?: boolean
  recurrence?: string
  location?: string | null
  phase?: string | null
}

function CalendarEventCard({ event }: { event: CalendarBlock }) {
  const Icon =
    event.kind === 'assignment'
      ? ClipboardList
      : event.kind === 'module'
        ? BookOpen
        : CalendarDays

  return (
    <article className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-gray-950">
            {event.title}
          </h4>
          <p className="mt-1 truncate text-xs font-semibold text-blue-600">
            {event.course_name}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            {event.kind === 'module' ? (
              <Icon size={14} />
            ) : (
              <Clock3 size={14} />
            )}
            {event.kind === 'module'
              ? phaseLabel(event.phase)
              : formatTimeRange(event.starts_at, event.ends_at)}
          </p>
        </div>
        {event.register_required && (
          <CopyCheck size={17} className="shrink-0 text-emerald-600" />
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs text-gray-500">
        <CalendarEventLocation location={event.location} />
        <span className="inline-flex h-fit items-center gap-1 rounded-md bg-white px-2 py-1 capitalize">
          <Icon size={12} />
          {event.kind === 'session' ? event.recurrence : event.kind}
        </span>
        {event.href && (
          <Link
            href={event.href}
            className="h-fit rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700 hover:bg-blue-100"
          >
            Open
          </Link>
        )}
      </div>
    </article>
  )
}

function CalendarEventLocation({ location }: { location?: string | null }) {
  if (!location) return null

  const link = getLocationLink(location)
  const isOnline =
    location.toLowerCase().includes('zoom') ||
    location.toLowerCase().includes('meet') ||
    location.toLowerCase().includes('jitsi') ||
    location.toLowerCase().includes('online') ||
    Boolean(link)

  const copyLocation = async () => {
    try {
      await navigator.clipboard.writeText(link || location)
      toast.success('Location copied')
    } catch {
      toast.error('Could not copy location')
    }
  }

  return (
    <span className="inline-flex min-w-0 max-w-full flex-1 items-start gap-1 rounded-md bg-white px-2 py-1 sm:flex-none">
      {isOnline ? (
        <Video size={12} className="mt-0.5 shrink-0" />
      ) : (
        <MapPin size={12} className="mt-0.5 shrink-0" />
      )}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-all font-semibold text-blue-700 hover:text-blue-800"
          title={location}
        >
          {location}
        </a>
      ) : (
        <span className="min-w-0 break-words">{location}</span>
      )}
      <button
        type="button"
        onClick={copyLocation}
        className="-my-1 ml-auto inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Copy location"
      >
        <Copy size={12} />
      </button>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Open location link"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </span>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[92px] rounded-md bg-white px-3 py-2">
      <p className="text-lg font-bold text-gray-950">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function eventDay(value: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    new Date(value)
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
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

function getLocationLink(location: string) {
  const match = location.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)
  if (!match) return null

  const url = match[0]
  return url.startsWith('http') ? url : `https://${url}`
}

function buildWeekBlocks(
  events: StudentTimetableEvent[],
  assignments: any[],
  orgslug: string
): CalendarBlock[] {
  const blocks: CalendarBlock[] = events.map((event) => ({
    id: event.event_uuid,
    kind: 'session',
    title: event.title,
    course_name: event.course_name,
    course_uuid: event.course_uuid,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    register_required: event.register_required,
    recurrence: event.recurrence,
    location: event.location,
    phase: event.weekly_schedule_phase,
    href: getUriWithOrg(
      orgslug,
      `/course/${event.course_uuid.replace('course_', '')}`
    ),
  }))

  events.forEach((event) => {
    if (
      !event.weekly_schedule_phase ||
      event.weekly_schedule_phase === 'rest'
    ) {
      return
    }
    blocks.push({
      id: `module-${event.event_uuid}`,
      kind: 'module',
      title: `${phaseLabel(event.weekly_schedule_phase)} block`,
      course_name: event.course_name,
      course_uuid: event.course_uuid,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      phase: event.weekly_schedule_phase,
      href: getUriWithOrg(
        orgslug,
        `/course/${event.course_uuid.replace('course_', '')}`
      ),
    })
  })

  assignments
    .filter((assignment) => assignment?.due_date)
    .forEach((assignment) => {
      blocks.push({
        id: assignment.assignment_uuid || `assignment-${assignment.id}`,
        kind: 'assignment',
        title: assignment.title || assignment.name || 'Assignment due',
        course_name: assignment.course_name,
        course_uuid: assignment.course_uuid,
        starts_at: assignment.due_date,
        ends_at: assignment.due_date,
        href: getUriWithOrg(
          orgslug,
          `/course/${assignment.course_uuid.replace('course_', '')}`
        ),
      })
    })

  return blocks
}

function phaseLabel(value?: string | null) {
  if (!value) return 'LMS block'
  const labels: Record<string, string> = {
    learn: 'New module released',
    practice: 'Practice',
    connect: 'Community connect',
    apply: 'Application',
    build: 'Project build',
    support: 'Support',
    rest: 'Rest',
  }
  return labels[value] || value.replaceAll('_', ' ')
}

export default CalendarClient
