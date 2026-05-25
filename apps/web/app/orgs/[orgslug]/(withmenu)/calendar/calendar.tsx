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
  CalendarDays,
  Clock3,
  CopyCheck,
  MapPin,
  Video,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import useSWR from 'swr'

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

  const calendarEvents = events || []
  const upcomingEvents = [...calendarEvents]
    .filter((event) => new Date(event.ends_at).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  const nextEvent = upcomingEvents[0]

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
                    Your published timetable sessions across all courses.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-3">
              <Metric label="Sessions" value={calendarEvents.length} />
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
                <h2 className="font-bold text-gray-950">Weekly schedule</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Sessions are grouped by the day they occur.
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {weekDays.map((day) => (
                  <CalendarDayRow
                    key={day}
                    day={day}
                    events={calendarEvents.filter(
                      (event) => eventDay(event.starts_at) === day
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
  events,
}: {
  day: string
  events: StudentTimetableEvent[]
}) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )

  return (
    <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[160px_minmax(0,1fr)]">
      <div className="flex items-center justify-between gap-2 lg:items-start">
        <h3 className="text-sm font-bold text-gray-800">{day}</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
          {events.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sortedEvents.map((event) => (
          <CalendarEventCard key={event.event_uuid} event={event} />
        ))}
        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400">
            No sessions
          </div>
        )}
      </div>
    </div>
  )
}

function CalendarEventCard({ event }: { event: StudentTimetableEvent }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-gray-950">
            {event.title}
          </h4>
          <p className="mt-1 truncate text-xs font-semibold text-blue-600">
            {event.course_name}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Clock3 size={14} />
            {formatTimeRange(event.starts_at, event.ends_at)}
          </p>
        </div>
        {event.register_required && (
          <CopyCheck size={17} className="shrink-0 text-emerald-600" />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        {event.location && (
          <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-1">
            {event.location.toLowerCase().includes('zoom') ||
            event.location.toLowerCase().includes('online') ? (
              <Video size={12} className="shrink-0" />
            ) : (
              <MapPin size={12} className="shrink-0" />
            )}
            <span className="truncate">{event.location}</span>
          </span>
        )}
        <span className="rounded-md bg-white px-2 py-1 capitalize">
          {event.recurrence}
        </span>
      </div>
    </article>
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

export default CalendarClient
