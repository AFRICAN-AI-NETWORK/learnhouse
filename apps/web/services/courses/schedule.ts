import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  errorHandling,
  getResponseMetadata,
} from '@services/utils/ts/requests'

export type TimetableRecurrence = 'none' | 'weekly' | 'biweekly' | 'monthly'
export type TimetableVisibility = 'draft' | 'published'
export type TimetableStatus = 'scheduled' | 'cancelled'
export type RegisterFrequency = 'weekly' | 'per_session' | 'daily' | 'manual'
export type RegisterEntryStatus = 'marked' | 'late' | 'missed' | 'excused'

export type CourseTimetableEvent = {
  id?: number
  event_uuid: string
  course_uuid: string
  title: string
  description?: string
  instructor_name?: string
  location?: string
  meeting_url?: string
  starts_at: string
  ends_at: string
  timezone: string
  recurrence: TimetableRecurrence
  visibility: TimetableVisibility
  status: TimetableStatus
  register_required: boolean
  creation_date?: string
  update_date?: string
}

export type StudentTimetableEvent = CourseTimetableEvent & {
  course_id: number
  course_name: string
  course_description?: string | null
}

export type CourseTimetableEventInput = Omit<
  CourseTimetableEvent,
  'id' | 'event_uuid' | 'course_uuid' | 'creation_date' | 'update_date'
>

export type CourseRegisterPolicy = {
  id?: number
  policy_uuid?: string
  course_uuid: string
  enabled: boolean
  frequency: RegisterFrequency
  checkin_opens_minutes_before: number
  checkin_closes_minutes_after: number
  requires_enrollment: boolean
  allow_late: boolean
  linked_timetable_event_uuid?: string | null
  creation_date?: string
  update_date?: string
}

export type CourseRegisterEntry = {
  id?: number
  entry_uuid: string
  course_uuid: string
  user_id: number
  timetable_event_uuid?: string | null
  period_start: string
  period_end: string
  status: RegisterEntryStatus
  marked_at?: string | null
  method: 'student_self_mark' | 'instructor_override'
  notes?: string | null
}

export type CourseRegisterSummary = {
  policy: CourseRegisterPolicy
  current_period: {
    starts_at: string
    ends_at: string
    checkin_opens_at: string
    checkin_closes_at: string
    is_open: boolean
  }
  current_entry?: CourseRegisterEntry | null
  entries: CourseRegisterEntry[]
}

const api = () => getAPIUrl()

export async function getCourseTimetable(
  course_uuid: string,
  access_token?: string
): Promise<CourseTimetableEvent[]> {
  const result = await fetch(
    `${api()}courses/${course_uuid}/timetable`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function getMyTimetable(
  org_id: string | number,
  access_token?: string
): Promise<StudentTimetableEvent[]> {
  const result = await fetch(
    `${api()}courses/timetable/me?org_id=${org_id}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function createCourseTimetableEvent(
  course_uuid: string,
  body: CourseTimetableEventInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}courses/${course_uuid}/timetable`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function updateCourseTimetableEvent(
  course_uuid: string,
  event_uuid: string,
  body: CourseTimetableEventInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}courses/${course_uuid}/timetable/${event_uuid}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function deleteCourseTimetableEvent(
  course_uuid: string,
  event_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}courses/${course_uuid}/timetable/${event_uuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getCourseRegisterPolicy(
  course_uuid: string,
  access_token?: string
): Promise<CourseRegisterPolicy> {
  const result = await fetch(
    `${api()}courses/${course_uuid}/register/policy`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function updateCourseRegisterPolicy(
  course_uuid: string,
  body: CourseRegisterPolicy,
  access_token?: string
) {
  const result = await fetch(
    `${api()}courses/${course_uuid}/register/policy`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getCourseRegisterSummary(
  course_uuid: string,
  access_token?: string
): Promise<CourseRegisterSummary> {
  const result = await fetch(
    `${api()}courses/${course_uuid}/register/summary`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function markCourseRegister(
  course_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}courses/${course_uuid}/register/mark`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getCourseRegisterEntries(
  course_uuid: string,
  access_token?: string
): Promise<CourseRegisterEntry[]> {
  const result = await fetch(
    `${api()}courses/${course_uuid}/register/entries`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export function getMockTimetable(course_uuid: string): CourseTimetableEvent[] {
  return [
    {
      event_uuid: 'mock_event_monday',
      course_uuid,
      title: 'Live lecture',
      instructor_name: 'Course instructor',
      location: 'Room A / Zoom',
      starts_at: getNextWeekdayIso(1, 9, 0),
      ends_at: getNextWeekdayIso(1, 10, 30),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      recurrence: 'weekly',
      visibility: 'published',
      status: 'scheduled',
      register_required: true,
      description: 'Weekly concept walkthrough and Q&A.',
    },
    {
      event_uuid: 'mock_event_wednesday',
      course_uuid,
      title: 'Workshop',
      instructor_name: 'Teaching team',
      location: 'Lab 2',
      starts_at: getNextWeekdayIso(3, 14, 0),
      ends_at: getNextWeekdayIso(3, 15, 30),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      recurrence: 'weekly',
      visibility: 'published',
      status: 'scheduled',
      register_required: true,
      description: 'Guided practice session.',
    },
    {
      event_uuid: 'mock_event_friday',
      course_uuid,
      title: 'Office hours',
      instructor_name: 'Course instructor',
      location: 'Online',
      starts_at: getNextWeekdayIso(5, 11, 0),
      ends_at: getNextWeekdayIso(5, 12, 0),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      recurrence: 'weekly',
      visibility: 'published',
      status: 'scheduled',
      register_required: false,
      description: 'Drop in for individual help.',
    },
  ]
}

export function getMockRegisterPolicy(
  course_uuid: string
): CourseRegisterPolicy {
  return {
    course_uuid,
    enabled: true,
    frequency: 'weekly',
    checkin_opens_minutes_before: 15,
    checkin_closes_minutes_after: 30,
    requires_enrollment: true,
    allow_late: true,
    linked_timetable_event_uuid: null,
  }
}

export function getMockRegisterSummary(
  course_uuid: string
): CourseRegisterSummary {
  const periodStart = getStartOfWeek()
  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 6)
  periodEnd.setHours(23, 59, 59, 999)

  return {
    policy: getMockRegisterPolicy(course_uuid),
    current_period: {
      starts_at: periodStart.toISOString(),
      ends_at: periodEnd.toISOString(),
      checkin_opens_at: new Date().toISOString(),
      checkin_closes_at: getTodayIso(10, 30),
      is_open: true,
    },
    current_entry: null,
    entries: [
      {
        entry_uuid: 'mock_register_last_week',
        course_uuid,
        user_id: 0,
        period_start: addDays(periodStart, -7).toISOString(),
        period_end: addDays(periodEnd, -7).toISOString(),
        status: 'marked',
        marked_at: addDays(periodStart, -7).toISOString(),
        method: 'student_self_mark',
      },
      {
        entry_uuid: 'mock_register_two_weeks',
        course_uuid,
        user_id: 0,
        period_start: addDays(periodStart, -14).toISOString(),
        period_end: addDays(periodEnd, -14).toISOString(),
        status: 'excused',
        marked_at: null,
        method: 'instructor_override',
        notes: 'Instructor override',
      },
    ],
  }
}

function getNextWeekdayIso(day: number, hours: number, minutes: number) {
  const date = new Date()
  const currentDay = date.getDay()
  const distance = (day + 7 - currentDay) % 7 || 7
  date.setDate(date.getDate() + distance)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function getTodayIso(hours: number, minutes: number) {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

function getStartOfWeek() {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
