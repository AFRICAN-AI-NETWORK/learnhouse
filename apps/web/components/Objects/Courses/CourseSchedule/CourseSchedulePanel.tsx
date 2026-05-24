'use client'

import React, { useMemo, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  CalendarDays,
  Check,
  Clock3,
  CopyCheck,
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
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950">This week</h2>
          <p className="mt-1 text-sm text-gray-500">
            Timetable sessions and your register status.
          </p>
        </div>
        <CalendarDays size={22} className="text-gray-400" />
      </div>

      {(timetableError || registerError) && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Preview data is showing until the schedule backend is connected.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-3">
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
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold capitalize text-gray-500">
          {event.recurrence}
        </span>
      </div>
      {event.location && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600">
          {event.location.toLowerCase().includes('zoom') ||
          event.location.toLowerCase().includes('online') ? (
            <Video size={13} />
          ) : (
            <MapPin size={13} />
          )}
          {event.location}
        </div>
      )}
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
    <aside className="rounded-lg border border-gray-200 bg-white p-4">
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
