'use client'

import React, { useMemo, useState } from 'react'
import { useCourse } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import {
  generateProgrammeWeeks,
  getCourseAcademicCohorts,
  getProgrammeWeeks,
  ProgrammeWeek,
  setCourseAcademicCohorts,
  updateProgrammeWeek,
} from '@services/courses/schedule'
import {
  getAcademicCohorts,
  getAcademicYears,
} from '@services/academic-calendar/academic-calendar'
import {
  createCourseMilestone,
  deleteCourseMilestone,
  getLearnerCourseJourney,
  getCourseMilestones,
  seedCourseJourney,
  setMilestoneProgress,
  updateCourseMilestone,
  MilestoneCriteria,
  MilestoneInput,
  MilestoneStatus,
  StudentJourneyMilestone,
  StudentMilestoneStatus,
} from '@services/student-journey/student-journey'
import {
  CalendarRange,
  CheckCircle2,
  Flag,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useSWR from 'swr'
import { searchOrgContent } from '@services/search/search'

function EditCourseMilestones() {
  const course = useCourse() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const courseStructure = course?.courseStructure
  const courseUuid = courseStructure?.course_uuid
  const chapters = useMemo(
    () => courseStructure?.chapters || [],
    [courseStructure?.chapters]
  )
  const [selectedCohortUuid, setSelectedCohortUuid] = useState('')
  const [weekCount, setWeekCount] = useState(12)
  const [savingWeekUuid, setSavingWeekUuid] = useState<string | null>(null)
  const [isSavingCourseCohorts, setIsSavingCourseCohorts] = useState(false)
  const [editingMilestoneUuid, setEditingMilestoneUuid] = useState<
    string | null
  >(null)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [milestoneConfigText, setMilestoneConfigText] = useState('{}')
  const [milestoneDraft, setMilestoneDraft] = useState<MilestoneInput>({
    phase: 'core_learning',
    name: '',
    description: '',
    sequence_order: 1,
    criteria: 'manual',
    criteria_config: {},
  })

  const {
    data: cohorts = [],
    error: cohortsError,
    mutate: mutateCohorts,
  } = useSWR(
    courseUuid ? ['course-academic-cohorts', courseUuid] : null,
    () => getCourseAcademicCohorts(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const {
    data: academicYears = [],
    error: academicYearsError,
    isLoading: isAcademicYearsLoading,
  } = useSWR(['academic-years'], () => getAcademicYears(accessToken), {
    shouldRetryOnError: false,
  })

  const {
    data: availableAcademicCohorts = [],
    error: availableCohortsError,
    isLoading: isAvailableCohortsLoading,
  } = useSWR(
    academicYears.length
      ? [
          'academic-calendar-cohorts',
          ...academicYears.map((year) => year.academic_year_uuid),
        ]
      : null,
    async () => {
      const cohortsByYear = await Promise.all(
        academicYears.map((year) =>
          getAcademicCohorts(year.academic_year_uuid, accessToken)
        )
      )
      return cohortsByYear.flat()
    },
    { shouldRetryOnError: false }
  )

  const linkedCohortUuids = cohorts.map((cohort) => cohort.academic_cohort_uuid)
  const activeCohortUuid =
    (cohorts.some(
      (cohort) => cohort.academic_cohort_uuid === selectedCohortUuid
    ) &&
      selectedCohortUuid) ||
    cohorts[0]?.academic_cohort_uuid ||
    ''
  const dropdownCohortUuid = selectedCohortUuid || activeCohortUuid
  const isDropdownCohortLinked = linkedCohortUuids.includes(dropdownCohortUuid)

  const {
    data: weeks = [],
    error: weeksError,
    mutate: mutateWeeks,
  } = useSWR(
    courseUuid && activeCohortUuid
      ? ['programme-weeks', courseUuid, activeCohortUuid]
      : null,
    () => getProgrammeWeeks(courseUuid, activeCohortUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const {
    data: milestones = [],
    error: milestonesError,
    mutate: mutateMilestones,
  } = useSWR(
    courseUuid ? ['course-milestones', courseUuid] : null,
    () => getCourseMilestones(courseUuid, accessToken),
    { shouldRetryOnError: false }
  )

  const chapterOptions = useMemo(
    () =>
      chapters.map((chapter: any, index: number) => ({
        id: chapter.id,
        label: `${index + 1}. ${chapter.name}`,
      })),
    [chapters]
  )

  const seedJourney = async () => {
    if (!courseUuid) return
    const result = await seedCourseJourney(courseUuid, accessToken)
    if (result.success) {
      toast.success('Default milestones ready')
      mutateMilestones()
    } else {
      toast.error(getApiErrorMessage(result))
    }
  }

  const generateWeeks = async () => {
    if (!courseUuid || !activeCohortUuid) {
      toast.error('Link this course to an academic cohort first')
      mutateCohorts()
      return
    }
    const result = await generateProgrammeWeeks(
      courseUuid,
      activeCohortUuid,
      weekCount,
      accessToken
    )
    if (result.success) {
      toast.success('Programme weeks generated')
      mutateWeeks()
    } else {
      toast.error(getApiErrorMessage(result))
    }
  }

  const linkSelectedCohort = async () => {
    if (!courseUuid || !dropdownCohortUuid || isDropdownCohortLinked) {
      return
    }
    setIsSavingCourseCohorts(true)
    try {
      const result = await setCourseAcademicCohorts(
        courseUuid,
        [...linkedCohortUuids, dropdownCohortUuid],
        accessToken
      )
      if (!result.success) throw new Error(getApiErrorMessage(result))
      setSelectedCohortUuid(dropdownCohortUuid)
      await mutateCohorts()
      toast.success('Course cohort linked')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save course cohorts'
      )
    } finally {
      setIsSavingCourseCohorts(false)
    }
  }

  const saveWeek = async (
    week: ProgrammeWeek,
    body: { chapter_id?: number | null; milestone_uuid?: string | null }
  ) => {
    if (!courseUuid) return
    setSavingWeekUuid(week.programme_week_uuid)
    try {
      const result = await updateProgrammeWeek(
        courseUuid,
        week.programme_week_uuid,
        body,
        accessToken
      )
      if (!result.success) throw new Error(getApiErrorMessage(result))
      toast.success('Week mapping saved')
      mutateWeeks()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save week'
      )
    } finally {
      setSavingWeekUuid(null)
    }
  }

  const startNewMilestone = () => {
    setEditingMilestoneUuid(null)
    setMilestoneConfigText('{}')
    setMilestoneDraft({
      phase: 'core_learning',
      name: '',
      description: '',
      sequence_order: milestones.length + 1,
      criteria: 'manual',
      criteria_config: {},
    })
    setShowMilestoneForm(true)
  }

  const startEditingMilestone = (milestone: StudentJourneyMilestone) => {
    setEditingMilestoneUuid(milestone.milestone_uuid)
    setMilestoneConfigText(JSON.stringify(milestone.criteria_config, null, 2))
    setMilestoneDraft({
      phase: milestone.phase,
      name: milestone.name,
      description: milestone.description || '',
      sequence_order: milestone.sequence_order,
      criteria: milestone.criteria,
      criteria_config: milestone.criteria_config,
    })
    setShowMilestoneForm(true)
  }

  const saveMilestone = async () => {
    if (!courseUuid) return
    let criteriaConfig: Record<string, any>
    try {
      criteriaConfig = JSON.parse(milestoneConfigText)
    } catch {
      toast.error('Criteria configuration must be valid JSON')
      return
    }
    const body = { ...milestoneDraft, criteria_config: criteriaConfig }
    const result = editingMilestoneUuid
      ? await updateCourseMilestone(editingMilestoneUuid, body, accessToken)
      : await createCourseMilestone(courseUuid, body, accessToken)
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    toast.success(
      editingMilestoneUuid ? 'Milestone updated' : 'Milestone created'
    )
    setShowMilestoneForm(false)
    setEditingMilestoneUuid(null)
    mutateMilestones()
  }

  const removeMilestone = async (milestone: StudentJourneyMilestone) => {
    if (
      !window.confirm(
        `Delete milestone "${milestone.name}" and its learner progress?`
      )
    ) {
      return
    }
    const result = await deleteCourseMilestone(
      milestone.milestone_uuid,
      accessToken
    )
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    toast.success('Milestone deleted')
    mutateMilestones()
    mutateWeeks()
  }

  if (!courseUuid) {
    return (
      <div className="p-10 text-sm text-gray-500">Loading milestones...</div>
    )
  }

  return (
    <div>
      <div className="h-6"></div>
      <div className="mx-4 space-y-5 sm:mx-10">
        {(cohortsError ||
          academicYearsError ||
          availableCohortsError ||
          weeksError ||
          milestonesError) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Calendar or milestone endpoints could not be reached for this
            course.
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-950">
                Programme calendar and milestones
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Map chapters and journey milestones to each calendar week.
              </p>
            </div>
            <button
              type="button"
              onClick={seedJourney}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <Plus size={16} />
              Seed milestones
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h2 className="font-bold text-gray-950">Course run</h2>
                <label className="mt-3 block">
                  <span className="text-xs font-bold text-gray-600">
                    Choose academic cohort
                  </span>
                  <select
                    value={dropdownCohortUuid}
                    onChange={(event) =>
                      setSelectedCohortUuid(event.target.value)
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    {!dropdownCohortUuid && (
                      <option value="" disabled>
                        {isAcademicYearsLoading || isAvailableCohortsLoading
                          ? 'Loading cohorts...'
                          : availableAcademicCohorts.length
                            ? 'Select a cohort'
                            : 'No cohorts available'}
                      </option>
                    )}
                    {academicYears.map((year) => {
                      const yearCohorts = availableAcademicCohorts.filter(
                        (cohort) =>
                          cohort.academic_year_uuid === year.academic_year_uuid
                      )
                      if (yearCohorts.length === 0) return null
                      return (
                        <optgroup
                          key={year.academic_year_uuid}
                          label={year.name}
                        >
                          {yearCohorts.map((cohort) => {
                            const isLinked = linkedCohortUuids.includes(
                              cohort.academic_cohort_uuid
                            )
                            return (
                              <option
                                key={cohort.academic_cohort_uuid}
                                value={cohort.academic_cohort_uuid}
                              >
                                {cohort.name} · {cohort.status}
                                {isLinked ? ' · linked' : ''}
                              </option>
                            )
                          })}
                        </optgroup>
                      )
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={linkSelectedCohort}
                  disabled={
                    !dropdownCohortUuid ||
                    isDropdownCohortLinked ||
                    isSavingCourseCohorts ||
                    isAvailableCohortsLoading
                  }
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSavingCourseCohorts
                    ? 'Linking...'
                    : isDropdownCohortLinked
                      ? 'Cohort linked'
                      : 'Link cohort'}
                </button>
                <label className="mt-3 block">
                  <span className="text-xs font-bold text-gray-600">
                    Number of weeks
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={104}
                    value={weekCount}
                    onChange={(event) =>
                      setWeekCount(Number(event.target.value))
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={generateWeeks}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <CalendarRange size={16} />
                  Generate weeks
                </button>
              </div>

              <MilestoneList
                milestones={milestones}
                onCreate={startNewMilestone}
                onEdit={startEditingMilestone}
                onDelete={removeMilestone}
              />
              {showMilestoneForm && (
                <MilestoneForm
                  draft={milestoneDraft}
                  configText={milestoneConfigText}
                  editing={Boolean(editingMilestoneUuid)}
                  setDraft={setMilestoneDraft}
                  setConfigText={setMilestoneConfigText}
                  onSave={saveMilestone}
                  onCancel={() => setShowMilestoneForm(false)}
                />
              )}
            </aside>

            <div className="space-y-3">
              {weeks.map((week) => (
                <WeekMappingRow
                  key={week.programme_week_uuid}
                  week={week}
                  chapters={chapterOptions}
                  milestones={milestones}
                  isSaving={savingWeekUuid === week.programme_week_uuid}
                  onSave={saveWeek}
                />
              ))}
              {weeks.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                  Generate programme weeks to start mapping chapters and
                  milestones.
                </div>
              )}
            </div>
          </div>
        </section>
        <LearnerProgressManager
          courseUuid={courseUuid}
          accessToken={accessToken}
        />
      </div>
    </div>
  )
}

type LearnerSearchResult = {
  id: number
  user_uuid: string
  first_name: string
  last_name: string
  username: string
}

function LearnerProgressManager({
  courseUuid,
  accessToken,
}: {
  courseUuid: string
  accessToken?: string
}) {
  const org = useOrg() as any
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LearnerSearchResult[]>([])
  const [selectedLearner, setSelectedLearner] =
    useState<LearnerSearchResult | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [loadedUserId, setLoadedUserId] = useState<number | null>(null)
  const [learnerMilestones, setLearnerMilestones] = useState<
    StudentMilestoneStatus[]
  >([])
  const [drafts, setDrafts] = useState<
    Record<string, { status: string; notes: string }>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [savingUuid, setSavingUuid] = useState<string | null>(null)

  const searchLearners = async () => {
    const query = searchQuery.trim()
    if (!query || !org?.slug) {
      toast.error('Enter a name or username to search')
      return
    }
    setIsSearching(true)
    setHasSearched(true)
    setSelectedLearner(null)
    setLoadedUserId(null)
    setLearnerMilestones([])
    try {
      const result = await searchOrgContent(
        org.slug,
        query,
        1,
        10,
        null,
        accessToken
      )
      if (!result.success) throw new Error(getApiErrorMessage(result))
      setSearchResults((result.data?.users || []) as LearnerSearchResult[])
    } catch {
      toast.error('Could not search organization members')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const loadLearner = async (learner: LearnerSearchResult) => {
    const userId = learner.id
    setIsLoading(true)
    try {
      const rows = await getLearnerCourseJourney(
        courseUuid,
        userId,
        accessToken
      )
      setSelectedLearner(learner)
      setLoadedUserId(userId)
      setLearnerMilestones(rows)
      setDrafts(
        Object.fromEntries(
          rows.map((row) => [
            row.milestone_uuid,
            {
              status: row.is_manual_override ? row.status : 'automatic',
              notes: row.notes || '',
            },
          ])
        )
      )
    } catch {
      toast.error('Could not load this learner journey')
      setLoadedUserId(null)
      setLearnerMilestones([])
    } finally {
      setIsLoading(false)
    }
  }

  const saveProgress = async (milestone: StudentMilestoneStatus) => {
    if (!loadedUserId) return
    const draft = drafts[milestone.milestone_uuid]
    if (!draft) return
    setSavingUuid(milestone.milestone_uuid)
    const result = await setMilestoneProgress(
      milestone.milestone_uuid,
      loadedUserId,
      {
        status:
          draft.status === 'automatic'
            ? null
            : (draft.status as MilestoneStatus),
        notes: draft.notes || null,
      },
      accessToken
    )
    setSavingUuid(null)
    if (!result.success) {
      toast.error(getApiErrorMessage(result))
      return
    }
    toast.success('Learner progress saved')
    if (selectedLearner) await loadLearner(selectedLearner)
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4">
        <h2 className="font-bold text-gray-950">Learner milestone progress</h2>
        <p className="mt-1 text-sm text-gray-500">
          Review a learner’s journey and set or clear manual status overrides.
        </p>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="text-xs font-bold text-gray-600">
              Search organization members
            </span>
            <input
              type="search"
              value={searchQuery}
              placeholder="Name or username"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void searchLearners()
              }}
              className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={searchLearners}
            disabled={isSearching || isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-gray-950 px-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            <Search size={15} />
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
            {searchResults.map((user) => {
              const fullName = [user.first_name, user.last_name]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={user.user_uuid}
                  type="button"
                  onClick={() => setSelectedLearner(user)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                    selectedLearner?.id === user.id ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
                    {fullName || user.username}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    @{user.username}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <p className="text-sm text-gray-500">
            No matching organization members.
          </p>
        )}
        {selectedLearner && (
          <div className="flex flex-col gap-2 rounded-md bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-gray-700">
              Selected:{' '}
              <span className="font-bold">
                {[selectedLearner.first_name, selectedLearner.last_name]
                  .filter(Boolean)
                  .join(' ') || selectedLearner.username}
              </span>{' '}
              <span className="text-gray-500">@{selectedLearner.username}</span>
            </p>
            <button
              type="button"
              onClick={() => loadLearner(selectedLearner)}
              disabled={isLoading}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={14} />
              {isLoading ? 'Loading...' : 'Load journey'}
            </button>
          </div>
        )}
      </div>
      {loadedUserId !== null && learnerMilestones.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-gray-500">
          No journey milestones were returned for user {loadedUserId}.
        </p>
      ) : learnerMilestones.length > 0 ? (
        <div className="divide-y divide-gray-100 px-4">
          {learnerMilestones.map((milestone) => {
            const draft = drafts[milestone.milestone_uuid]
            return (
              <div
                key={milestone.milestone_uuid}
                className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto] lg:items-end"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">
                    {milestone.name}
                  </p>
                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {phaseLabel(milestone.phase)} / current:{' '}
                    {milestone.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <label>
                  <span className="text-xs font-bold text-gray-600">
                    Override
                  </span>
                  <select
                    value={draft?.status || 'automatic'}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [milestone.milestone_uuid]: {
                          ...draft,
                          status: event.target.value,
                        },
                      })
                    }
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                  >
                    <option value="automatic">Automatic</option>
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="achieved">Achieved</option>
                    <option value="at_risk">At risk</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs font-bold text-gray-600">
                    Staff note
                  </span>
                  <input
                    value={draft?.notes || ''}
                    onChange={(event) =>
                      setDrafts({
                        ...drafts,
                        [milestone.milestone_uuid]: {
                          ...draft,
                          notes: event.target.value,
                        },
                      })
                    }
                    className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => saveProgress(milestone)}
                  disabled={savingUuid === milestone.milestone_uuid}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-gray-950 px-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  <Save size={14} />
                  {savingUuid === milestone.milestone_uuid
                    ? 'Saving...'
                    : 'Save'}
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function SmallIconButton({
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
      className="inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900"
    >
      {children}
    </button>
  )
}

function MilestoneList({
  milestones,
  onCreate,
  onEdit,
  onDelete,
}: {
  milestones: StudentJourneyMilestone[]
  onCreate: () => void
  onEdit: (milestone: StudentJourneyMilestone) => void
  onDelete: (milestone: StudentJourneyMilestone) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag size={17} className="text-gray-500" />
          <h2 className="font-bold text-gray-950">Milestones</h2>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-md bg-gray-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.milestone_uuid}
            className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-800">
                {milestone.name}
              </p>
              <p className="mt-1 text-xs capitalize text-gray-500">
                {phaseLabel(milestone.phase)} /{' '}
                {milestone.criteria.replaceAll('_', ' ')}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <SmallIconButton
                label="Edit milestone"
                onClick={() => onEdit(milestone)}
              >
                <Pencil size={14} />
              </SmallIconButton>
              <SmallIconButton
                label="Delete milestone"
                onClick={() => onDelete(milestone)}
              >
                <Trash2 size={14} />
              </SmallIconButton>
            </div>
          </div>
        ))}
        {milestones.length === 0 && (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
            No milestones yet.
          </p>
        )}
      </div>
    </div>
  )
}

function MilestoneForm({
  draft,
  configText,
  editing,
  setDraft,
  setConfigText,
  onSave,
  onCancel,
}: {
  draft: MilestoneInput
  configText: string
  editing: boolean
  setDraft: (draft: MilestoneInput) => void
  setConfigText: (value: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  const phases = ['onboarding', 'core_learning', 'capstone', 'alumni'] as const
  const criteria: MilestoneCriteria[] = [
    'manual',
    'course_started',
    'chapter_completed',
    'course_grade_at_least',
    'required_assignments_graded',
    'certificate_issued',
  ]

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-bold text-gray-950">
        {editing ? 'Edit milestone' : 'Create milestone'}
      </h3>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-xs font-bold text-gray-600">Name</span>
          <input
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Phase</span>
            <select
              value={draft.phase}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  phase: event.target.value as MilestoneInput['phase'],
                })
              }
              className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
            >
              {phases.map((phase) => (
                <option key={phase} value={phase}>
                  {phaseLabel(phase)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Order</span>
            <input
              type="number"
              min={1}
              value={draft.sequence_order}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  sequence_order: Number(event.target.value),
                })
              }
              className="mt-1 h-10 w-full rounded-md border border-gray-200 px-3 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">
            Completion rule
          </span>
          <select
            value={draft.criteria}
            onChange={(event) =>
              setDraft({
                ...draft,
                criteria: event.target.value as MilestoneCriteria,
              })
            }
            className="mt-1 h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
          >
            {criteria.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">Description</span>
          <textarea
            value={draft.description || ''}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
            className="mt-1 min-h-16 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold text-gray-600">
            Criteria configuration (JSON)
          </span>
          <textarea
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-gray-200 px-3 py-2 font-mono text-xs"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Save size={15} />
            {editing ? 'Save milestone' : 'Create milestone'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <X size={15} />
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}

function WeekMappingRow({
  week,
  chapters,
  milestones,
  isSaving,
  onSave,
}: {
  week: ProgrammeWeek
  chapters: { id: number; label: string }[]
  milestones: StudentJourneyMilestone[]
  isSaving: boolean
  onSave: (
    week: ProgrammeWeek,
    body: { chapter_id?: number | null; milestone_uuid?: string | null }
  ) => void
}) {
  const [chapterId, setChapterId] = useState(
    week.chapter_id ? String(week.chapter_id) : ''
  )
  const [milestoneUuid, setMilestoneUuid] = useState(week.milestone_uuid || '')

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)_160px] lg:items-end">
        <div>
          <p className="font-bold text-gray-950">Week {week.week_number}</p>
          <p className="mt-1 text-sm text-gray-500">
            {formatDate(week.starts_on)} - {formatDate(week.ends_on)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Chapter</span>
            <select
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">No chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-bold text-gray-600">Milestone</span>
            <select
              value={milestoneUuid}
              onChange={(event) => setMilestoneUuid(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">No milestone</option>
              {milestones.map((milestone) => (
                <option
                  key={milestone.milestone_uuid}
                  value={milestone.milestone_uuid}
                >
                  {milestone.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() =>
            onSave(week, {
              chapter_id: chapterId ? Number(chapterId) : null,
              milestone_uuid: milestoneUuid || null,
            })
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {isSaving ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
    </article>
  )
}

function phaseLabel(value: string) {
  if (value === 'core_learning') return 'Learning'
  if (value === 'alumni') return 'Graduation'
  return value.replaceAll('_', ' ')
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
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

export default EditCourseMilestones
