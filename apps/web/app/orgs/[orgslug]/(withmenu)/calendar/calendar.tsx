'use client'

import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import {
  getMyTimetable,
  StudentTimetableEvent,
} from '@services/courses/schedule'
import type { EventClickArg, EventContentArg } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  Copy,
  CopyCheck,
  ExternalLink,
  Loader2,
  MapPin,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { getOrgCourses } from '@services/courses/courses'
import { getAssignmentsFromACourse } from '@services/courses/assignments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'

/*
 * Design tokens
 * Type scale:  text-xs (meta) / text-sm (body) / text-lg (section) / text-2xl (page title)
 * Weights:     font-medium (body emphasis) / font-semibold (labels, titles)
 * Radius:      rounded-md (chips, buttons), rounded-lg (cards), rounded-full (pills)
 * Motion:      all transitions use EASE, hover lift is 2px at most
 */
const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

const KIND_COLORS = {
  session: 'bg-[#2563eb]',
  module: 'bg-[#0f766e]',
  assignment: 'bg-[#b45309]',
} as const

const KIND_LABELS = {
  session: 'Session',
  module: 'Module',
  assignment: 'Assignment',
} as const

const reveal = (mounted: boolean, delay: string) =>
  `transition-all duration-500 ${EASE} motion-reduce:transition-none ${delay} ${
    mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
  }`

/* FullCalendar theming, done with Tailwind arbitrary variants only */
const CALENDAR_THEME = [
  'min-w-0 text-sm',
  '[&_.fc]:[--fc-border-color:#e5e7eb] [&_.fc]:[--fc-today-bg-color:#eff6ff] [&_.fc]:[--fc-neutral-bg-color:#f9fafb]',
  '[&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:gap-3 [&_.fc-toolbar]:!mb-4',
  'max-sm:[&_.fc-toolbar]:flex-col max-sm:[&_.fc-toolbar]:items-stretch',
  'max-sm:[&_.fc-toolbar-chunk]:flex max-sm:[&_.fc-toolbar-chunk]:justify-center',
  '[&_.fc-toolbar-title]:text-lg [&_.fc-toolbar-title]:font-semibold [&_.fc-toolbar-title]:text-gray-950',
  '[&_.fc-button]:!rounded-md [&_.fc-button]:!border-gray-200 [&_.fc-button]:!bg-white [&_.fc-button]:!text-xs [&_.fc-button]:!font-semibold [&_.fc-button]:!capitalize [&_.fc-button]:!text-gray-700 [&_.fc-button]:!shadow-none',
  '[&_.fc-button]:transition-colors [&_.fc-button]:duration-200 [&_.fc-button]:ease-[cubic-bezier(0.22,1,0.36,1)]',
  '[&_.fc-button:hover]:!bg-gray-100 [&_.fc-button:disabled]:opacity-50',
  '[&_.fc-button-active]:!border-blue-600 [&_.fc-button-active]:!bg-blue-600 [&_.fc-button-active]:!text-white [&_.fc-button-active:hover]:!bg-blue-700',
  '[&_.fc-col-header-cell-cushion]:py-2 [&_.fc-col-header-cell-cushion]:text-xs [&_.fc-col-header-cell-cushion]:font-semibold [&_.fc-col-header-cell-cushion]:uppercase [&_.fc-col-header-cell-cushion]:text-gray-500',
  '[&_.fc-daygrid-day-number]:text-xs [&_.fc-daygrid-day-number]:font-medium [&_.fc-daygrid-day-number]:text-gray-700',
  '[&_.fc-event]:cursor-pointer [&_.fc-event]:rounded-md [&_.fc-event]:px-1 [&_.fc-event]:text-xs [&_.fc-event]:font-medium',
  '[&_.fc-event]:transition-transform [&_.fc-event]:duration-200 [&_.fc-event]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:[&_.fc-event]:transition-none',
  '[&_.fc-event:hover]:-translate-y-px',
  '[&_.fc-more-link]:text-xs [&_.fc-more-link]:font-semibold [&_.fc-more-link]:text-blue-600',
  '[&_.fc-timegrid-slot-label-cushion]:text-xs [&_.fc-timegrid-slot-label-cushion]:text-gray-500',
  '[&_.fc-timegrid-slot]:!h-12',
  '[&_.fc-timegrid-event]:overflow-hidden [&_.fc-timegrid-event]:rounded-md [&_.fc-timegrid-event]:border [&_.fc-timegrid-event]:!border-white',
  '[&_.fc-timegrid-event-harness]:!min-h-8',
].join(' ')

/*
 * Week and day views: show the title, course and time inside each block
 * so activities stay readable instead of collapsing into a thin line.
 * Month view and all-day items keep FullCalendar's default rendering.
 */
function renderEventContent(info: EventContentArg) {
  if (!info.view.type.startsWith('timeGrid') || info.event.allDay) return true

  const block = info.event.extendedProps.block as CalendarBlock | undefined

  return (
    <div className="flex h-full min-w-0 flex-col gap-0.5 overflow-hidden px-1.5 py-1 text-left text-white">
      <p className="truncate text-xs font-semibold leading-tight">
        {info.event.title}
      </p>
      {block?.course_name && (
        <p className="truncate text-xs leading-tight opacity-90">
          {block.course_name}
        </p>
      )}
      {info.timeText && (
        <p className="truncate text-xs leading-tight opacity-80">
          {info.timeText}
        </p>
      )}
    </div>
  )
}

function CalendarClient({ orgslug }: { orgslug: string }) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [now] = useState(() => Date.now())
  const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

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

  const { data: courseAssignmentsData, isLoading: assignmentsLoading } = useSWR(
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
  const calendarBlocks = useMemo(
    () => buildCalendarBlocks(calendarEvents, courseAssignments, orgslug),
    [calendarEvents, courseAssignments, orgslug]
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <GeneralWrapperStyled>
        <div className="space-y-5 pb-10 sm:space-y-6">
          {/* Header */}
          <header
            className={`${reveal(mounted, 'delay-0')} flex flex-col gap-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between`}
          >
            <div className="min-w-0">
              <Link
                href={getUriWithOrg(orgslug, '/')}
                className={`mb-3 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-gray-500 transition-colors duration-200 ${EASE} hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
              >
                <ArrowLeft size={16} />
                Back to home
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold leading-snug text-gray-950">
                    Calendar
                  </h1>
                  <p className="text-sm leading-normal text-gray-500">
                    Your calendar across sessions, modules, and assessments.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 rounded-lg bg-gray-50 p-2 sm:gap-3 sm:p-3 lg:w-auto">
              <Metric
                label="Blocks"
                value={calendarBlocks.length}
                loading={isLoading}
              />
              <Metric
                label="Courses"
                value={
                  new Set(calendarEvents.map((event) => event.course_uuid)).size
                }
                loading={isLoading}
              />
              <Metric
                label="Registers"
                value={
                  calendarEvents.filter((event) => event.register_required)
                    .length
                }
                loading={isLoading}
              />
            </div>
          </header>

          {/* Next session */}
          {nextEvent && (
            <section
              className={`${reveal(mounted, 'delay-75')} rounded-lg border border-blue-100 bg-blue-50 p-4 sm:p-5`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Next session
              </p>
              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold leading-snug text-blue-950">
                    {nextEvent.title}
                  </h2>
                  <p className="mt-1 text-sm text-blue-800">
                    {nextEvent.course_name} ·{' '}
                    {formatDateTime(nextEvent.starts_at)}
                  </p>
                </div>
                {nextEvent.register_required && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                    <CopyCheck size={14} />
                    Register required
                  </span>
                )}
              </div>
            </section>
          )}

          {/* Loading skeleton */}
          {isLoading && <CalendarSkeleton />}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className={`${reveal(mounted, 'delay-75')} rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`}
            >
              Could not load your calendar. Please try again.
            </div>
          )}

          {/* Calendar */}
          {!isLoading && !error && (
            <section
              className={`${reveal(mounted, 'delay-150')} min-w-0 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-600">
                  {(
                    Object.keys(KIND_COLORS) as Array<keyof typeof KIND_COLORS>
                  ).map((kind) => (
                    <li key={kind} className="inline-flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-sm ${KIND_COLORS[kind]}`}
                      />
                      {KIND_LABELS[kind]}
                    </li>
                  ))}
                </ul>
                {assignmentsLoading && (
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"
                    aria-live="polite"
                  >
                    <Loader2 size={12} className="animate-spin" />
                    Loading assignments
                  </span>
                )}
              </div>

              <div className={CALENDAR_THEME}>
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay',
                  }}
                  buttonText={{
                    today: 'today',
                    month: 'month',
                    week: 'week',
                    day: 'day',
                  }}
                  events={calendarBlocks.map((block) => ({
                    id: block.id,
                    title: block.title,
                    start: block.starts_at,
                    end:
                      block.starts_at === block.ends_at
                        ? undefined
                        : block.ends_at,
                    allDay:
                      block.kind === 'assignment' &&
                      !/[T ]\d{2}:\d{2}/.test(block.starts_at),
                    backgroundColor:
                      block.kind === 'assignment'
                        ? '#b45309'
                        : block.kind === 'module'
                          ? '#0f766e'
                          : '#2563eb',
                    borderColor: 'transparent',
                    extendedProps: { block },
                  }))}
                  eventClick={(info: EventClickArg) => {
                    info.jsEvent.preventDefault()
                    setSelectedBlock(info.event.extendedProps.block)
                  }}
                  height="min(72vh, 760px)"
                  firstDay={0}
                  dayMaxEvents={3}
                  scrollTime="06:00:00"
                  nowIndicator
                  eventContent={renderEventContent}
                  eventMinHeight={32}
                  eventShortHeight={48}
                  defaultTimedEventDuration="01:00"
                  slotEventOverlap={false}
                  eventTimeFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short',
                  }}
                />
              </div>
            </section>
          )}

          <Dialog
            open={selectedBlock !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedBlock(null)
            }}
          >
            <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden rounded-lg p-0">
              {selectedBlock && (
                <>
                  <DialogHeader className="shrink-0 border-b border-gray-100 p-4 pr-12 text-left sm:p-5 sm:pr-12">
                    <DialogTitle className="text-lg font-semibold leading-snug">
                      {selectedBlock.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      {selectedBlock.course_name} ·{' '}
                      {formatDateTime(selectedBlock.starts_at)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                    <CalendarEventCard event={selectedBlock} />
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </GeneralWrapperStyled>
    </main>
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

function CalendarSkeleton() {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:p-5"
      aria-busy="true"
      aria-label="Loading calendar"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="h-8 w-40 animate-pulse rounded-md bg-gray-100" />
        <div className="h-6 w-32 animate-pulse rounded-md bg-gray-100" />
        <div className="h-8 w-48 animate-pulse rounded-md bg-gray-100" />
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-100 bg-gray-100">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[56px] bg-white p-2 sm:min-h-[96px]"
          >
            <div className="h-3 w-4 animate-pulse rounded bg-gray-100" />
            {index % 4 === 1 && (
              <div className="mt-2 hidden h-4 w-full animate-pulse rounded-md bg-gray-100 sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
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
          <h4 className="truncate text-sm font-semibold text-gray-950">
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
          <CopyCheck size={16} className="shrink-0 text-emerald-600" />
        )}
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs text-gray-500">
        <CalendarEventLocation location={event.location} />
        <span className="inline-flex h-fit items-center gap-1.5 rounded-md bg-white px-2 py-1 font-medium capitalize">
          <Icon size={12} />
          {event.kind === 'session' ? event.recurrence : event.kind}
        </span>
        {event.href && (
          <Link
            href={event.href}
            className={`h-fit rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 transition-colors duration-200 ${EASE} hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
          >
            Open
          </Link>
        )}
      </div>
    </article>
  )
}

function CalendarEventLocation({ location }: { location?: string | null }) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>(
    'idle'
  )

  if (!location) return null

  const link = getLocationLink(location)
  const isOnline =
    location.toLowerCase().includes('zoom') ||
    location.toLowerCase().includes('meet') ||
    location.toLowerCase().includes('jitsi') ||
    location.toLowerCase().includes('online') ||
    Boolean(link)

  const copyLocation = async () => {
    if (copyState === 'copying') return
    setCopyState('copying')
    try {
      await navigator.clipboard.writeText(link || location)
      toast.success('Location copied')
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      toast.error('Could not copy location')
      setCopyState('idle')
    }
  }

  const iconButton = `-my-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors duration-200 ${EASE} hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600`

  return (
    <span className="inline-flex min-w-0 max-w-full flex-1 items-start gap-1.5 rounded-md bg-white px-2 py-1 sm:flex-none">
      {isOnline ? (
        <Video size={12} className="mt-1 shrink-0" />
      ) : (
        <MapPin size={12} className="mt-1 shrink-0" />
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
        <span className="min-w-0 break-words font-medium">{location}</span>
      )}
      <button
        type="button"
        onClick={copyLocation}
        disabled={copyState === 'copying'}
        className={`${iconButton} ml-auto disabled:cursor-wait`}
        aria-label="Copy location"
      >
        {copyState === 'copying' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : copyState === 'copied' ? (
          <Check size={12} className="text-emerald-600" />
        ) : (
          <Copy size={12} />
        )}
      </button>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={iconButton}
          aria-label="Open location link"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </span>
  )
}

function Metric({
  label,
  value,
  loading,
}: {
  label: string
  value: number
  loading?: boolean
}) {
  return (
    <div
      className={`min-w-0 rounded-lg bg-white px-3 py-2 transition-transform duration-200 ${EASE} hover:-translate-y-0.5 sm:min-w-[92px]`}
    >
      {loading ? (
        <div className="h-7 w-8 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className="text-lg font-semibold leading-snug text-gray-950">
          {value}
        </p>
      )}
      <p className="mt-0.5 text-xs font-medium text-gray-500">{label}</p>
    </div>
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

function buildCalendarBlocks(
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
