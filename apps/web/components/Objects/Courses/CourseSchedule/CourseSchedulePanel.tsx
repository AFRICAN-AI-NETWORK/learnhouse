'use client'

import React, { useMemo, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  CopyCheck,
  ExternalLink,
  MapPin,
  Video,
} from 'lucide-react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import {
  CourseRegisterEntry,
  CourseRegisterSummary,
  CourseTimetableEvent,
  getCourseRegisterSummary,
  getCourseTimetable,
  getMockRegisterSummary,
  getMockTimetable,
  markCourseRegister,
} from '@services/courses/schedule'

function CourseSchedulePanel({ courseUuid }: { courseUuid: string }) {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [localMarkedAt, setLocalMarkedAt] = useState<string | null>(null)
  const [isMarking, setIsMarking] = useState(false)

  const {
    data: timetableData,
    error: timetableError,
  } = useSWR(
    courseUuid ? ['student-course-timetable', courseUuid] : null,
    () => getCourseTimetable(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const {
    data: registerData,
    error: registerError,
    mutate: mutateRegister,
  } = useSWR(
    courseUuid ? ['student-register-summary', courseUuid] : null,
    () => getCourseRegisterSummary(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const timetable = useMemo(
    () =>
      timetableData ||
      (timetableError ? getMockTimetable(courseUuid) : []),
    [courseUuid, timetableData, timetableError]
  )
  const registerSummary = useMemo(
    () =>
      registerData ||
      (registerError ? getMockRegisterSummary(courseUuid) : undefined),
    [courseUuid, registerData, registerError]
  )

  const upcoming = useMemo(
    () =>
      [...timetable]
        .filter((event) => event.visibility === 'published')
        .sort(
          (a, b) =>
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
        .slice(0, 3),
    [timetable]
  )

  const hasMarked = Boolean(registerSummary?.current_entry || localMarkedAt)
  const canMark =
    registerSummary?.policy?.enabled &&
    registerSummary.current_period?.is_open &&
    !hasMarked

  const markRegister = async () => {
    if (!courseUuid) return
    setIsMarking(true)
    try {
      const result = await markCourseRegister(courseUuid, accessToken)
      if (!result.success) {
        throw new Error(result.HTTPmessage)
      }
      toast.success('Register marked')
      mutateRegister()
    } catch {
      setLocalMarkedAt(new Date().toISOString())
      toast('Backend endpoint not connected yet. Mark shown locally.')
    } finally {
      setIsMarking(false)
    }
  }

  if (!timetableData && !timetableError && !registerData && !registerError) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-950">This week</h2>
          <p className="mt-1 text-sm text-gray-500">
            Timetable sessions and your register status.
          </p>
        </div>
        <CalendarDays size={22} className="hidden shrink-0 text-gray-400 sm:block" />
      </div>

      {(timetableError || registerError) && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Preview data is showing until the schedule backend is connected.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          {upcoming.map((event) => (
            <TimetableCard key={event.event_uuid} event={event} />
          ))}
          {upcoming.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              No timetable sessions have been published yet.
            </div>
          )}
        </div>

        <RegisterCard
          registerSummary={registerSummary}
          hasMarked={hasMarked}
          localMarkedAt={localMarkedAt}
          canMark={Boolean(canMark)}
          isMarking={isMarking}
          onMark={markRegister}
        />
      </div>
    </section>
  )
}

function TimetableCard({ event }: { event: CourseTimetableEvent }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-gray-950">{event.title}</h3>
            {event.register_required && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <CopyCheck size={12} />
                Register
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-gray-600">
            <Clock3 size={15} />
            {formatDateTime(event.starts_at)} - {formatTime(event.ends_at)}
          </p>
          {event.instructor_name && (
            <p className="mt-1 text-sm text-gray-500">
              With {event.instructor_name}
            </p>
          )}
        </div>
        <span className="w-fit shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold capitalize text-gray-500">
          {event.recurrence}
        </span>
      </div>
      <EventLocation location={event.location} />
    </div>
  )
}

function RegisterCard({
  registerSummary,
  hasMarked,
  localMarkedAt,
  canMark,
  isMarking,
  onMark,
}: {
  registerSummary?: CourseRegisterSummary
  hasMarked: boolean
  localMarkedAt: string | null
  canMark: boolean
  isMarking: boolean
  onMark: () => void
}) {
  const currentEntry = registerSummary?.current_entry
  const markedAt = currentEntry?.marked_at || localMarkedAt
  const closesAt = registerSummary?.current_period?.checkin_closes_at

  return (
    <aside className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-950">Student register</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasMarked
              ? `Marked ${markedAt ? formatDateTime(markedAt) : 'this period'}`
              : closesAt
                ? `Open until ${formatTime(closesAt)}`
                : 'Waiting for register window'}
          </p>
        </div>
        <StatusBadge status={hasMarked ? 'marked' : canMark ? 'open' : 'closed'} />
      </div>

      <button
        type="button"
        onClick={onMark}
        disabled={!canMark || isMarking}
        className={`mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold ${
          canMark
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : hasMarked
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-400'
        } disabled:cursor-not-allowed`}
      >
        {hasMarked ? <Check size={17} /> : <CopyCheck size={17} />}
        {isMarking
          ? 'Marking...'
          : hasMarked
            ? 'Register marked'
            : 'Mark register'}
      </button>

      <div className="mt-5">
        <h4 className="mb-2 text-xs font-bold uppercase text-gray-400">
          Previous weeks
        </h4>
        <div className="space-y-2">
          {(registerSummary?.entries || []).slice(0, 3).map((entry) => (
            <RegisterHistoryRow key={entry.entry_uuid} entry={entry} />
          ))}
          {!registerSummary?.entries?.length && (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              No register history yet.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

function EventLocation({ location }: { location?: string | null }) {
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
    <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-md bg-white px-2.5 py-2 text-xs font-semibold text-gray-600 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-1.5">
        {isOnline ? (
          <Video size={13} className="mt-0.5 shrink-0" />
        ) : (
          <MapPin size={13} className="mt-0.5 shrink-0" />
        )}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 break-all text-blue-700 hover:text-blue-800"
            title={location}
          >
            {location}
          </a>
        ) : (
          <span className="min-w-0 break-words">{location}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
        <button
          type="button"
          onClick={copyLocation}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Copy location"
        >
          <Copy size={14} />
        </button>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Open location link"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  )
}

function getLocationLink(location: string) {
  const match = location.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)
  if (!match) return null

  const url = match[0]
  return url.startsWith('http') ? url : `https://${url}`
}

function RegisterHistoryRow({ entry }: { entry: CourseRegisterEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          Week of {formatShortDate(entry.period_start)}
        </p>
        {entry.notes && (
          <p className="truncate text-xs text-gray-500">{entry.notes}</p>
        )}
      </div>
      <StatusBadge status={entry.status} />
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-blue-50 text-blue-700',
    marked: 'bg-emerald-50 text-emerald-700',
    late: 'bg-amber-50 text-amber-700',
    missed: 'bg-red-50 text-red-700',
    excused: 'bg-gray-100 text-gray-600',
    closed: 'bg-gray-100 text-gray-500',
  }

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || styles.closed
      }`}
    >
      {status}
    </span>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default CourseSchedulePanel
