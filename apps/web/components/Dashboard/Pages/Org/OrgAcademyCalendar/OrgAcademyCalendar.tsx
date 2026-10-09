'use client'

import React, { useMemo, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  AcademicYear,
  createAcademicCohort,
  createAcademicYear,
  deleteAcademicCohort,
  deleteAcademicYear,
  getActiveAcademicYear,
  getAcademicCohorts,
  getAcademicYears,
  updateAcademicCohort,
  updateAcademicYear,
} from '@services/academic-calendar/academic-calendar'
import { AcademicCohort } from '@services/courses/schedule'
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import {
  LearningPhase,
  WeeklySchedule,
  getDefaultWeeklySchedule,
  getRestDayConflicts,
  updateDefaultWeeklySchedule,
} from '@services/courses/schedule'

const today = new Date().toISOString().slice(0, 10)

function OrgAcademyCalendar() {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const [selectedYearUuid, setSelectedYearUuid] = useState<string>('')
  const [editingYearUuid, setEditingYearUuid] = useState<string | null>(null)
  const [editingCohortUuid, setEditingCohortUuid] = useState<string | null>(
    null
  )
  const [yearForm, setYearForm] = useState({
    name: `Academic Year ${new Date().getFullYear()}`,
    region: 'Continental',
    start_date: today,
    end_date: nextYear(today),
    is_active: true,
  })
  const [cohortForm, setCohortForm] = useState({
    name: 'New cohort',
    start_date: today,
    end_date: nextYear(today),
    enrollment_window_start: today,
    enrollment_window_end: today,
    status: 'upcoming' as AcademicCohort['status'],
  })
  const [isSavingYear, setIsSavingYear] = useState(false)
  const [isSavingCohort, setIsSavingCohort] = useState(false)

  const {
    data: years = [],
    error: yearsError,
    mutate: mutateYears,
  } = useSWR(['academic-years'], () => getAcademicYears(accessToken), {
    shouldRetryOnError: false,
  })

  const { data: activeYear, mutate: mutateActiveYear } = useSWR(
    ['active-academic-year'],
    () => getActiveAcademicYear(accessToken),
    { shouldRetryOnError: false }
  )

  const activeYearUuid =
    selectedYearUuid ||
    activeYear?.academic_year_uuid ||
    years[0]?.academic_year_uuid
  const {
    data: cohorts = [],
    error: cohortsError,
    mutate: mutateCohorts,
  } = useSWR(
    activeYearUuid ? ['academic-cohorts', activeYearUuid] : null,
    () => getAcademicCohorts(activeYearUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const selectedYear = useMemo(
    () => years.find((year) => year.academic_year_uuid === activeYearUuid),
    [activeYearUuid, years]
  )

  const saveYear = async () => {
    setIsSavingYear(true)
    try {
      const result = editingYearUuid
        ? await updateAcademicYear(editingYearUuid, yearForm, accessToken)
        : await createAcademicYear(yearForm, accessToken)
      if (!result.success) throw new Error(getApiErrorMessage(result))
      toast.success(
        editingYearUuid ? 'Academic year updated' : 'Academic year created'
      )
      if (result.data?.academic_year_uuid) {
        setSelectedYearUuid(result.data.academic_year_uuid)
      }
      setEditingYearUuid(null)
      mutateYears()
      mutateActiveYear()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save year'
      )
    } finally {
      setIsSavingYear(false)
    }
  }

  const editYear = (year: AcademicYear) => {
    setSelectedYearUuid(year.academic_year_uuid)
    setEditingYearUuid(year.academic_year_uuid)
    setYearForm({
      name: year.name,
      region: year.region || '',
      start_date: year.start_date,
      end_date: year.end_date,
      is_active: year.is_active,
    })
  }

  const removeYear = async (year: AcademicYear) => {
    if (
      !window.confirm(
        `Delete ${year.name}? Academic years with cohorts cannot be deleted.`
      )
    )
      return
    const result = await deleteAcademicYear(
      year.academic_year_uuid,
      accessToken
    )
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    if (selectedYearUuid === year.academic_year_uuid) setSelectedYearUuid('')
    if (editingYearUuid === year.academic_year_uuid) setEditingYearUuid(null)
    toast.success('Academic year deleted')
    mutateYears()
    mutateActiveYear()
    mutateCohorts()
  }

  const saveCohort = async () => {
    if (!activeYearUuid) {
      toast.error('Create or select an academic year first')
      return
    }
    setIsSavingCohort(true)
    try {
      const result = editingCohortUuid
        ? await updateAcademicCohort(editingCohortUuid, cohortForm, accessToken)
        : await createAcademicCohort(
            { ...cohortForm, academic_year_uuid: activeYearUuid },
            accessToken
          )
      if (!result.success) throw new Error(getApiErrorMessage(result))
      toast.success(editingCohortUuid ? 'Cohort updated' : 'Cohort created')
      setEditingCohortUuid(null)
      mutateCohorts()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save cohort'
      )
    } finally {
      setIsSavingCohort(false)
    }
  }

  const editCohort = (cohort: AcademicCohort) => {
    setEditingCohortUuid(cohort.academic_cohort_uuid)
    setCohortForm({
      name: cohort.name,
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      enrollment_window_start: cohort.enrollment_window_start || '',
      enrollment_window_end: cohort.enrollment_window_end || '',
      status: cohort.status,
    })
  }

  const removeCohort = async (cohort: AcademicCohort) => {
    if (
      !window.confirm(
        `Delete ${cohort.name}? Cohorts linked to a course cannot be deleted.`
      )
    )
      return
    const result = await deleteAcademicCohort(
      cohort.academic_cohort_uuid,
      accessToken
    )
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    toast.success('Cohort deleted')
    mutateCohorts()
  }

  return (
    <div className="mx-4 space-y-5 sm:mx-10">
      <Tabs defaultValue="academic-calendar" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger
            value="academic-calendar"
            className="h-full min-w-0 gap-1 px-2 py-2 text-center text-xs leading-tight sm:gap-2 sm:text-sm"
          >
            <CalendarDays size={15} className="shrink-0" />
            <span>Academic calendar</span>
          </TabsTrigger>
          <TabsTrigger
            value="weekly-schedule"
            className="h-full min-w-0 gap-1 px-2 py-2 text-center text-xs leading-tight sm:gap-2 sm:text-sm"
          >
            <Clock3 size={15} className="shrink-0" />
            <span>Weekly schedule</span>
          </TabsTrigger>
          <TabsTrigger
            value="rest-day-conflicts"
            className="h-full min-w-0 gap-1 px-2 py-2 text-center text-xs leading-tight sm:gap-2 sm:text-sm"
          >
            <AlertTriangle size={15} className="shrink-0" />
            <span>Rest-day conflicts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="academic-calendar" className="mt-0 space-y-5">
          {(yearsError || cohortsError) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The academy calendar API could not be reached with your current
              session.
            </div>
          )}

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">
                  Continental academic calendar
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define academic years, cohorts, breaks and graduation windows.
                </p>
              </div>
              <CalendarDays className="text-gray-400" size={22} />
            </div>

            <div className="grid grid-cols-1 gap-5 p-4 xl:grid-cols-[380px_minmax(0,1fr)]">
              <aside className="space-y-3">
                {years.map((year) => (
                  <div key={year.academic_year_uuid} className="relative">
                    <YearButton
                      year={year}
                      isActive={year.academic_year_uuid === activeYearUuid}
                      onClick={() => {
                        setSelectedYearUuid(year.academic_year_uuid)
                        setEditingYearUuid(null)
                        setEditingCohortUuid(null)
                      }}
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <IconButton
                        label="Edit academic year"
                        onClick={() => editYear(year)}
                      >
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        label="Delete academic year"
                        onClick={() => removeYear(year)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                ))}
                {years.length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                    No academic years yet.
                  </div>
                )}
              </aside>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <FormPanel
                  title={
                    editingYearUuid ? 'Edit academic year' : 'Academic year'
                  }
                  description={
                    editingYearUuid
                      ? 'Update the selected year.'
                      : 'Annual operating window for the academy.'
                  }
                  icon={<Plus size={18} />}
                  actionLabel={
                    isSavingYear
                      ? 'Saving...'
                      : editingYearUuid
                        ? 'Save year'
                        : 'Create year'
                  }
                  onSubmit={saveYear}
                >
                  <TextField
                    label="Name"
                    value={yearForm.name}
                    onChange={(value) =>
                      setYearForm({ ...yearForm, name: value })
                    }
                  />
                  <TextField
                    label="Region"
                    value={yearForm.region}
                    onChange={(value) =>
                      setYearForm({ ...yearForm, region: value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Starts"
                      type="date"
                      value={yearForm.start_date}
                      onChange={(value) =>
                        setYearForm({ ...yearForm, start_date: value })
                      }
                    />
                    <TextField
                      label="Ends"
                      type="date"
                      value={yearForm.end_date}
                      onChange={(value) =>
                        setYearForm({ ...yearForm, end_date: value })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={yearForm.is_active}
                      onChange={(event) =>
                        setYearForm({
                          ...yearForm,
                          is_active: event.target.checked,
                        })
                      }
                    />
                    Active academic year
                  </label>
                  {editingYearUuid && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingYearUuid(null)
                        setYearForm({
                          name: `Academic Year ${new Date().getFullYear()}`,
                          region: 'Continental',
                          start_date: today,
                          end_date: nextYear(today),
                          is_active: true,
                        })
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      <X size={15} />
                      Cancel editing
                    </button>
                  )}
                </FormPanel>

                <FormPanel
                  title="Cohort dates"
                  description={
                    selectedYear
                      ? `Attached to ${selectedYear.name}.`
                      : 'Select an academic year first.'
                  }
                  icon={<GraduationCap size={18} />}
                  actionLabel={
                    isSavingCohort
                      ? 'Saving...'
                      : editingCohortUuid
                        ? 'Save cohort'
                        : 'Create cohort'
                  }
                  onSubmit={saveCohort}
                >
                  <TextField
                    label="Name"
                    value={cohortForm.name}
                    onChange={(value) =>
                      setCohortForm({ ...cohortForm, name: value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Starts"
                      type="date"
                      value={cohortForm.start_date}
                      onChange={(value) =>
                        setCohortForm({ ...cohortForm, start_date: value })
                      }
                    />
                    <TextField
                      label="Ends"
                      type="date"
                      value={cohortForm.end_date}
                      onChange={(value) =>
                        setCohortForm({ ...cohortForm, end_date: value })
                      }
                    />
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-gray-600">
                      Status
                    </span>
                    <select
                      value={cohortForm.status}
                      onChange={(event) =>
                        setCohortForm({
                          ...cohortForm,
                          status: event.target
                            .value as typeof cohortForm.status,
                        })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  {editingCohortUuid && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCohortUuid(null)
                        setCohortForm({
                          name: 'New cohort',
                          start_date: today,
                          end_date: nextYear(today),
                          enrollment_window_start: today,
                          enrollment_window_end: today,
                          status: 'upcoming',
                        })
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      <X size={15} />
                      Cancel editing
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Enrollment opens"
                      type="date"
                      value={cohortForm.enrollment_window_start}
                      onChange={(value) =>
                        setCohortForm({
                          ...cohortForm,
                          enrollment_window_start: value,
                        })
                      }
                    />
                    <TextField
                      label="Enrollment closes"
                      type="date"
                      value={cohortForm.enrollment_window_end}
                      onChange={(value) =>
                        setCohortForm({
                          ...cohortForm,
                          enrollment_window_end: value,
                        })
                      }
                    />
                  </div>
                </FormPanel>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-950">
                  Cohorts and key periods
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Break and graduation periods are represented as named cohorts
                  for now.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cohorts.map((cohort) => (
                <CohortCard
                  key={cohort.academic_cohort_uuid}
                  cohort={cohort}
                  onEdit={() => editCohort(cohort)}
                  onDelete={() => removeCohort(cohort)}
                />
              ))}
              {cohorts.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                  No cohorts for this year.
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="weekly-schedule" className="mt-0">
          <DefaultWeeklySchedulePanel accessToken={accessToken} />
        </TabsContent>

        <TabsContent value="rest-day-conflicts" className="mt-0">
          <RestDayConflictsPanel accessToken={accessToken} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DefaultWeeklySchedulePanel({ accessToken }: { accessToken?: string }) {
  const {
    data: schedule,
    error,
    mutate,
  } = useSWR(['default-weekly-schedule'], () =>
    getDefaultWeeklySchedule(accessToken)
  )
  const [isSaving, setIsSaving] = useState(false)
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]
  const phases: LearningPhase[] = [
    'learn',
    'practice',
    'connect',
    'apply',
    'build',
    'support',
    'rest',
  ]

  const changeSchedule = (
    update: (current: WeeklySchedule) => WeeklySchedule
  ) => {
    void mutate((current) => (current ? update(current) : current), false)
  }

  const saveSchedule = async () => {
    if (!schedule) return
    setIsSaving(true)
    const result = await updateDefaultWeeklySchedule(
      {
        name: schedule.name,
        timezone: schedule.timezone,
        rest_day_enforced: schedule.rest_day_enforced,
        days: schedule.days,
      },
      accessToken
    )
    setIsSaving(false)
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    toast.success('Default weekly schedule saved')
    mutate()
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-gray-950">
            Organization weekly schedule
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Default weekly phases and rest-day enforcement for courses without
            an override.
          </p>
        </div>
        <button
          type="button"
          onClick={saveSchedule}
          disabled={!schedule || isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save default'}
        </button>
      </div>
      {error && (
        <p className="m-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Could not load the organization weekly schedule.
        </p>
      )}
      {!schedule ? (
        <p className="p-4 text-sm text-gray-500">Loading weekly schedule...</p>
      ) : (
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Schedule name"
              value={schedule.name}
              onChange={(name) =>
                changeSchedule((current) => ({ ...current, name }))
              }
            />
            <TextField
              label="Fallback timezone"
              value={schedule.timezone}
              onChange={(timezone) =>
                changeSchedule((current) => ({ ...current, timezone }))
              }
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={schedule.rest_day_enforced}
              onChange={(event) =>
                changeSchedule((current) => ({
                  ...current,
                  rest_day_enforced: event.target.checked,
                }))
              }
            />
            Enforce rest days for published events and due dates
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
            {schedule.days.map((day) => (
              <label
                key={day.weekday}
                className="rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {weekdays[day.weekday]}
                  </span>
                  <input
                    type="checkbox"
                    checked={day.is_rest_day}
                    aria-label={`${weekdays[day.weekday]} rest day`}
                    onChange={(event) =>
                      changeSchedule((current) => ({
                        ...current,
                        days: current.days.map((item) =>
                          item.weekday === day.weekday
                            ? { ...item, is_rest_day: event.target.checked }
                            : item
                        ),
                      }))
                    }
                  />
                </div>
                <select
                  value={day.phase}
                  onChange={(event) =>
                    changeSchedule((current) => ({
                      ...current,
                      days: current.days.map((item) =>
                        item.weekday === day.weekday
                          ? {
                              ...item,
                              phase: event.target.value as LearningPhase,
                            }
                          : item
                      ),
                    }))
                  }
                  className="mt-2 h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                >
                  {phases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase[0].toUpperCase() + phase.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function RestDayConflictsPanel({ accessToken }: { accessToken?: string }) {
  const {
    data: conflicts = [],
    error,
    isLoading,
  } = useSWR(
    ['org-rest-day-conflicts'],
    () => getRestDayConflicts(accessToken),
    { shouldRetryOnError: false }
  )

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-950">
            Published rest-day conflicts
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Published sessions, chapter dates, and assignment due dates that
            fall on configured rest days.
          </p>
        </div>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
          {conflicts.length}
        </span>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-amber-800">
          Could not load conflicts with your current permissions.
        </p>
      ) : isLoading ? (
        <p className="mt-3 text-sm text-gray-500">Loading conflicts...</p>
      ) : conflicts.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-700">
          No published rest-day conflicts.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {conflicts.map((conflict) => (
            <li
              key={`${conflict.item_type}-${conflict.item_uuid}`}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span className="min-w-0 font-semibold text-gray-800">
                {conflict.title}
              </span>
              <span className="capitalize text-gray-500">
                {conflict.item_type.replaceAll('_', ' ')}
              </span>
              <span className="text-gray-600">
                {conflict.conflicting_dates.join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </button>
  )
}

function YearButton({
  year,
  isActive,
  onClick,
}: {
  year: AcademicYear
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left ${
        isActive
          ? 'border-blue-300 bg-blue-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-950">{year.name}</p>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(year.start_date)} - {formatDate(year.end_date)}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-600">
          {year.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
    </button>
  )
}

function CohortCard({
  cohort,
  onEdit,
  onDelete,
}: {
  cohort: AcademicCohort
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-gray-950">{cohort.name}</p>
        <div className="flex gap-1">
          <IconButton label="Edit cohort" onClick={onEdit}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete cohort" onClick={onDelete}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {formatDate(cohort.start_date)} - {formatDate(cohort.end_date)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white px-2 py-1 capitalize text-gray-600">
          {cohort.status}
        </span>
        {cohort.enrollment_window_start && cohort.enrollment_window_end && (
          <span className="rounded-full bg-white px-2 py-1 text-gray-600">
            Enrollment {formatDate(cohort.enrollment_window_start)} -{' '}
            {formatDate(cohort.enrollment_window_end)}
          </span>
        )}
      </div>
    </article>
  )
}

function FormPanel({
  title,
  description,
  icon,
  actionLabel,
  onSubmit,
  children,
}: {
  title: string
  description: string
  icon: React.ReactNode
  actionLabel: string
  onSubmit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-gray-950">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onSubmit}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        <Save size={16} />
        {actionLabel}
      </button>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  )
}

function nextYear(value: string) {
  const date = new Date(value)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function getApiErrorMessage(result: {
  data: any
  HTTPmessage: string
  status: number
}) {
  const detail = result.data?.detail
  if (typeof detail === 'string') return detail
  return result.HTTPmessage || `Request failed with status ${result.status}`
}

export default OrgAcademyCalendar
