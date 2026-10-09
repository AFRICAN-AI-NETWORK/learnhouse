'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'
import {
  getCourseAcademicCohorts,
  getProgrammeWeeks,
  ProgrammeWeek,
} from '@services/courses/schedule'
import {
  getMyCourseJourney,
  StudentMilestoneStatus,
} from '@services/student-journey/student-journey'
import { ArrowRight, CalendarDays, Check, Circle } from 'lucide-react'
import useSWR from 'swr'

type CourseChapter = {
  id: number
  name: string
  activities?: { id: number; name?: string }[]
}

type WeekProgress = {
  week: ProgrammeWeek
  chapter?: CourseChapter
  milestone?: StudentMilestoneStatus
  percentage: number | null
  completedCount: number
  requirementCount: number
}

type JourneyStep = {
  milestone: StudentMilestoneStatus
  week?: WeekProgress
}

function CourseJourneyPanel({
  courseUuid,
  orgslug,
  chapters,
  completedActivityIds,
  fullPage = false,
}: {
  courseUuid: string
  orgslug: string
  chapters: CourseChapter[]
  completedActivityIds: (number | string)[]
  fullPage?: boolean
}) {
  const [selectedMilestoneUuid, setSelectedMilestoneUuid] = useState<
    string | null
  >(null)
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const { data: milestones = [], error: milestonesError } = useSWR(
    courseUuid ? ['my-course-journey', courseUuid] : null,
    () => getMyCourseJourney(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )
  const { data: cohorts = [] } = useSWR(
    courseUuid ? ['course-academic-cohorts', courseUuid] : null,
    () => getCourseAcademicCohorts(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )
  const { data: allWeeks = [], error: weeksError } = useSWR(
    courseUuid ? ['programme-weeks', courseUuid] : null,
    () => getProgrammeWeeks(courseUuid, undefined, accessToken),
    { shouldRetryOnError: false }
  )

  const currentCohort = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (
      cohorts.find(
        (cohort) => cohort.start_date <= today && cohort.end_date >= today
      ) ||
      cohorts.find((cohort) => cohort.start_date > today) ||
      [...cohorts].sort((left, right) =>
        right.end_date.localeCompare(left.end_date)
      )[0]
    )
  }, [cohorts])
  const weeks = useMemo(
    () =>
      allWeeks
        .filter(
          (week) =>
            !currentCohort ||
            week.academic_cohort_uuid === currentCohort.academic_cohort_uuid
        )
        .sort((left, right) => left.week_number - right.week_number),
    [allWeeks, currentCohort]
  )
  const completedActivitySet = useMemo(
    () => new Set(completedActivityIds.map(String)),
    [completedActivityIds]
  )
  const weekProgress = useMemo(
    () =>
      weeks.map((week) =>
        getWeekProgress(week, chapters, milestones, completedActivitySet)
      ),
    [weeks, chapters, milestones, completedActivitySet]
  )
  const orderedMilestones = useMemo(
    () =>
      [...milestones].sort(
        (left, right) => left.sequence_order - right.sequence_order
      ),
    [milestones]
  )
  const journeySteps = useMemo(
    () =>
      orderedMilestones.map((milestone) => ({
        milestone,
        week: weekProgress.find(
          (week) => week.week.milestone_uuid === milestone.milestone_uuid
        ),
      })),
    [orderedMilestones, weekProgress]
  )
  const activeStepIndex = journeySteps.findIndex(
    ({ milestone }) => milestone.status !== 'achieved'
  )
  const selectedStep =
    journeySteps.find(
      ({ milestone }) => milestone.milestone_uuid === selectedMilestoneUuid
    ) || journeySteps[activeStepIndex >= 0 ? activeStepIndex : 0]

  const achievedCount = orderedMilestones.filter(
    (milestone) => milestone.status === 'achieved'
  ).length
  const nextMilestone = orderedMilestones.find(
    (milestone) => milestone.status !== 'achieved'
  )
  const trackableWeeks = weekProgress.filter((week) => week.percentage !== null)
  const achievedWeeks = trackableWeeks.filter(
    (week) => week.percentage === 100
  ).length
  const overallPercentage = trackableWeeks.length
    ? Math.round(
        trackableWeeks.reduce(
          (total, week) => total + (week.percentage || 0),
          0
        ) / trackableWeeks.length
      )
    : null
  const today = new Date().toISOString().slice(0, 10)
  const currentWeekIndex = weekProgress.findIndex(
    ({ week }) => week.starts_on <= today && week.ends_on >= today
  )
  const nextWeekIndex = weekProgress.findIndex(
    ({ week }) => week.starts_on > today
  )
  const previewStartIndex =
    currentWeekIndex >= 0
      ? currentWeekIndex
      : nextWeekIndex >= 0
        ? nextWeekIndex
        : Math.max(weekProgress.length - 3, 0)
  const visibleWeeks = fullPage
    ? weekProgress
    : weekProgress.slice(previewStartIndex, previewStartIndex + 3)
  const cleanCourseUuid = courseUuid.replace(/^course_/, '')

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="shrink-0 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-950">
              {fullPage ? 'Course journey' : 'Your weekly journey'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {overallPercentage === null
              ? `${achievedCount}/${milestones.length} milestones achieved`
              : `${overallPercentage}% complete across trackable weeks · ${achievedWeeks}/${trackableWeeks.length} weeks complete`}
          </p>
        </div>
        {fullPage && overallPercentage !== null && (
          <ProgressRing value={overallPercentage} label="Overall progress" />
        )}
        {fullPage ? (
          <Link
            href={getUriWithOrg(orgslug, `/course/${cleanCourseUuid}`)}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <ArrowRight size={15} className="rotate-180" />
            Back to course
          </Link>
        ) : (
          <Link
            href={getUriWithOrg(orgslug, `/course/${cleanCourseUuid}/journey`)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            View course journey
            <ArrowRight size={15} />
          </Link>
        )}
      </div>

      {(milestonesError || weeksError) && (
        <p className="px-4 pt-4 text-sm text-amber-700">
          Some journey progress could not be loaded.
        </p>
      )}

      <div className="space-y-4 p-4 sm:p-5">
        {fullPage ? (
          journeySteps.length > 0 ? (
            <div className="space-y-5">
              <MilestoneStepper
                steps={journeySteps}
                activeStepIndex={activeStepIndex}
                selectedMilestoneUuid={selectedStep?.milestone.milestone_uuid}
                onSelect={setSelectedMilestoneUuid}
              />
              {selectedStep && (
                <MilestoneDetails
                  step={selectedStep}
                  completedActivityIds={completedActivitySet}
                />
              )}
            </div>
          ) : visibleWeeks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {visibleWeeks.map((week) => (
                <WeekProgressRow
                  key={week.week.programme_week_uuid}
                  week={week}
                  cohortName={currentCohort?.name}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
              No journey milestones or weekly topics have been published yet.
            </p>
          )
        ) : visibleWeeks.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {visibleWeeks.map((week) => (
              <WeekProgressRow
                key={week.week.programme_week_uuid}
                week={week}
                cohortName={currentCohort?.name}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            Weekly topics have not been published for this course yet.
          </p>
        )}

        {!fullPage && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
            <span className="font-semibold text-gray-800">Milestones</span>
            <span>
              {achievedCount} of {milestones.length} achieved
            </span>
            {nextMilestone && (
              <span className="truncate">
                Next: <span className="font-medium">{nextMilestone.name}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function MilestoneStepper({
  steps,
  activeStepIndex,
  selectedMilestoneUuid,
  onSelect,
}: {
  steps: JourneyStep[]
  activeStepIndex: number
  selectedMilestoneUuid?: string
  onSelect: (milestoneUuid: string) => void
}) {
  return (
    <nav
      aria-label="Course milestone progress"
      className="overflow-x-auto pb-2"
    >
      <ol className="mx-auto flex w-max min-w-full items-start justify-center">
        {steps.map(({ milestone, week }, index) => {
          const isAchieved = milestone.status === 'achieved'
          const isCurrent = index === activeStepIndex
          const isSelected = milestone.milestone_uuid === selectedMilestoneUuid
          const isPending = !isAchieved && !isCurrent

          return (
            <li
              key={milestone.milestone_uuid}
              className="flex w-48 items-start"
            >
              <button
                type="button"
                onClick={() => onSelect(milestone.milestone_uuid)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-pressed={isSelected}
                className="group flex w-36 shrink-0 flex-col items-center gap-2 rounded-md px-2 py-2 text-center hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    isAchieved
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isSelected || isCurrent
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-500'
                  }`}
                >
                  {isAchieved ? <Check size={18} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-gray-500">
                    {week
                      ? `Week ${week.week.week_number}`
                      : `Step ${index + 1}`}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-bold text-gray-900">
                    {milestone.name}
                  </span>
                  <span
                    className={`mt-1 block text-xs capitalize ${
                      isAchieved
                        ? 'text-emerald-700'
                        : isCurrent
                          ? 'text-blue-700'
                          : isPending
                            ? 'text-gray-400'
                            : 'text-gray-500'
                    }`}
                  >
                    {isAchieved
                      ? 'Achieved'
                      : isCurrent
                        ? 'Current'
                        : isPending
                          ? 'Pending'
                          : milestone.status.replaceAll('_', ' ')}
                  </span>
                </span>
              </button>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`mt-5 h-0.5 min-w-6 flex-1 ${isAchieved ? 'bg-emerald-500' : 'bg-gray-200'}`}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function MilestoneDetails({
  step,
  completedActivityIds,
}: {
  step: JourneyStep
  completedActivityIds: Set<string>
}) {
  const { milestone, week } = step
  const progress =
    week?.percentage ?? (milestone.status === 'achieved' ? 100 : 0)
  const activities = week?.chapter?.activities || []

  return (
    <section
      aria-live="polite"
      className="grid gap-5 border-t border-gray-200 pt-5 md:grid-cols-[minmax(0,1fr)_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-blue-700">
              {week
                ? `Week ${week.week.week_number} milestone`
                : 'Course milestone'}
            </p>
            <h3 className="mt-1 text-xl font-bold text-gray-950">
              {milestone.name}
            </h3>
            {milestone.description && (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                {milestone.description}
              </p>
            )}
          </div>
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold capitalize ${
              milestone.status === 'achieved'
                ? 'bg-emerald-50 text-emerald-700'
                : milestone.status === 'at_risk'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {milestone.status.replaceAll('_', ' ')}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900">Completion rule</h4>
            <p className="mt-1 text-sm capitalize text-gray-600">
              {milestone.criteria.replaceAll('_', ' ')}
            </p>
          </div>

          {week?.chapter && (
            <div>
              <h4 className="text-sm font-bold text-gray-900">
                Week topic: {week.chapter.name}
              </h4>
              {activities.length > 0 ? (
                <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
                  {activities.map((activity, index) => {
                    const isComplete = completedActivityIds.has(
                      String(activity.id)
                    )
                    return (
                      <li
                        key={activity.id}
                        className="flex items-center gap-2 px-3 py-2 text-sm"
                      >
                        {isComplete ? (
                          <Check
                            size={15}
                            className="shrink-0 text-emerald-600"
                          />
                        ) : (
                          <Circle
                            size={15}
                            className="shrink-0 text-gray-300"
                          />
                        )}
                        <span className="flex-1 text-gray-700">
                          {activity.name || `Activity ${index + 1}`}
                        </span>
                        <span
                          className={`text-xs font-semibold ${isComplete ? 'text-emerald-700' : 'text-gray-500'}`}
                        >
                          {isComplete ? 'Achieved' : 'Pending'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  No activities are assigned to this chapter.
                </p>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 text-sm">
            {milestone.status === 'achieved' ? (
              <Check size={16} className="mt-0.5 text-emerald-600" />
            ) : (
              <Circle size={16} className="mt-0.5 text-gray-400" />
            )}
            <p className="text-gray-700">
              Milestone status:{' '}
              <span className="font-semibold capitalize">
                {milestone.status.replaceAll('_', ' ')}
              </span>
            </p>
          </div>
        </div>
      </div>

      <ProgressRing value={progress} label="Selected milestone progress" />
    </section>
  )
}

function ProgressRing({
  value,
  label,
  compact = false,
}: {
  value: number
  label: string
  compact?: boolean
}) {
  const safeValue = Math.max(0, Math.min(100, value))
  const ringColor = safeValue === 100 ? '#059669' : '#2563eb'

  return (
    <div
      className="flex shrink-0 items-center gap-3"
      role="img"
      aria-label={`${label}: ${safeValue}%`}
    >
      <div
        className={`flex items-center justify-center rounded-full ${compact ? 'h-12 w-12' : 'h-16 w-16'}`}
        style={{
          background: `conic-gradient(${ringColor} ${safeValue * 3.6}deg, #e5e7eb 0deg)`,
        }}
      >
        <div
          className={`flex items-center justify-center rounded-full bg-white font-bold text-gray-900 ${compact ? 'h-9 w-9 text-xs' : 'h-12 w-12 text-sm'}`}
        >
          {safeValue}%
        </div>
      </div>
      <span
        className={`font-semibold text-gray-500 ${compact ? 'max-w-16 text-[10px]' : 'max-w-24 text-xs'}`}
      >
        {label}
      </span>
    </div>
  )
}

function getWeekProgress(
  week: ProgrammeWeek,
  chapters: CourseChapter[],
  milestones: StudentMilestoneStatus[],
  completedActivityIds: Set<string>
): WeekProgress {
  const chapter = chapters.find((item) => item.id === week.chapter_id)
  const milestone = milestones.find(
    (item) => item.milestone_uuid === week.milestone_uuid
  )
  const activities = chapter?.activities || []
  const completedActivities = activities.filter((activity) =>
    completedActivityIds.has(String(activity.id))
  ).length
  const requirementCount = activities.length + (milestone ? 1 : 0)
  const completedCount =
    completedActivities + (milestone?.status === 'achieved' ? 1 : 0)

  return {
    week,
    chapter,
    milestone,
    percentage: requirementCount
      ? Math.round((completedCount / requirementCount) * 100)
      : null,
    completedCount,
    requirementCount,
  }
}

function WeekProgressRow({
  week: {
    week,
    chapter,
    milestone,
    percentage,
    completedCount,
    requirementCount,
  },
  cohortName,
}: {
  week: WeekProgress
  cohortName?: string
}) {
  return (
    <article className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="font-bold text-gray-950">Week {week.week_number}</h3>
          <span className="text-xs text-gray-500">
            {formatWeekDates(week.starts_on, week.ends_on)}
          </span>
          {cohortName && (
            <span className="text-xs text-gray-400">{cohortName}</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <p className="text-gray-700">
            <span className="font-semibold">Topic:</span>{' '}
            {week.chapter_id
              ? chapter?.name || 'Chapter assigned'
              : 'None assigned'}
          </p>
          {week.milestone_uuid && (
            <div className="text-gray-700">
              <p className="flex items-center gap-1.5">
                {milestone?.status === 'achieved' ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Circle size={14} className="text-gray-400" />
                )}
                <span>
                  {milestone?.name || 'Milestone'}:{' '}
                  {milestone?.status === 'achieved'
                    ? 'achieved'
                    : milestone?.status.replaceAll('_', ' ') || 'not achieved'}
                </span>
              </p>
              {milestone?.description && (
                <p className="mt-1 pl-5 text-xs text-gray-500">
                  {milestone.description}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="sm:text-right">
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {percentage === null ? (
            <span className="text-sm font-semibold text-gray-500">
              Not trackable
            </span>
          ) : (
            <ProgressRing value={percentage} label="complete" compact />
          )}
          {percentage !== null && (
            <span className="text-xs text-gray-500">
              {completedCount}/{requirementCount}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function formatWeekDates(startsOn: string, endsOn: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${formatter.format(new Date(`${startsOn}T00:00:00`))} - ${formatter.format(new Date(`${endsOn}T00:00:00`))}`
}

export default CourseJourneyPanel
