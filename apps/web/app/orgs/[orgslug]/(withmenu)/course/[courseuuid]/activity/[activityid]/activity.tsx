'use client'
import Link from 'next/link'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import {
  BookOpenCheck,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  UserRoundPen,
  Edit2,
  Minimize2,
  Info,
  Loader2,
  Lock,
  Trophy,
  Video,
  StickyNote,
  Backpack,
  Radio,
} from 'lucide-react'
import {
  markActivityAsComplete,
  unmarkActivityAsComplete,
} from '@services/courses/activity'
import { useRouter } from 'next/navigation'
import AuthenticatedClientElement from '@components/Security/AuthenticatedClientElement'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { useOrg } from '@components/Contexts/OrgContext'
import { CourseProvider } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from 'react'
import {
  getAssignmentFromActivityUUID,
  getFinalGrade,
  submitAssignmentForGrading,
} from '@services/courses/assignments'
import { AssignmentProvider } from '@components/Contexts/Assignments/AssignmentContext'
import { AssignmentsTaskProvider } from '@components/Contexts/Assignments/AssignmentsTaskContext'
import AssignmentSubmissionProvider, {
  useAssignmentSubmission,
} from '@components/Contexts/Assignments/AssignmentSubmissionContext'
import toast from 'react-hot-toast'
import { mutate } from 'swr'
import useSWR from 'swr'
import { swrFetcher } from '@services/utils/ts/requests'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
// import { useMediaQuery } from 'usehooks-ts'
import PaidCourseActivityDisclaimer from '@components/Objects/Courses/CourseActions/PaidCourseActivityDisclaimer'
import { useContributorStatus } from '../../../../../../../../hooks/useContributorStatus'
import ActivityChapterDropdown from '@components/Pages/Activity/ActivityChapterDropdown'
import CourseEndView from '@components/Pages/Activity/CourseEndView'
import { motion, AnimatePresence } from 'framer-motion'
import MiniInfoTooltip from '@components/Objects/MiniInfoTooltip'
import { useTranslation } from 'react-i18next'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import { useActivityHeartbeat } from '../../../../../../../../hooks/useActivityHeartbeat'
import NextImage from 'next/image'

// Lazy load heavy components
const Canva = lazy(
  () => import('@components/Objects/Activities/DynamicCanva/DynamicCanva')
)
const VideoActivity = lazy(
  () => import('@components/Objects/Activities/Video/Video')
)
const DocumentPdfActivity = lazy(
  () => import('@components/Objects/Activities/DocumentPdf/DocumentPdf')
)
const SmartArticleActivity = lazy(
  () =>
    import('@components/Objects/Activities/SmartArticle/SmartArticleActivity')
)
const LiveSessionActivity = lazy(
  () => import('@components/Objects/Activities/LiveSession/LiveSessionActivity')
)
const AssignmentStudentActivity = lazy(
  () =>
    import(
      '@components/Objects/Activities/Assignment/AssignmentStudentActivity'
    )
)
const AIActivityAsk = lazy(
  () => import('@components/Objects/Activities/AI/AIActivityAsk')
)
const AIChatBotProvider = lazy(
  () => import('@components/Contexts/AI/AIChatBotContext')
)

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="relative w-6 h-6">
      <div className="absolute top-0 left-0 w-full h-full border-2 border-gray-100 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-2 border-gray-400 rounded-full animate-spin border-t-transparent"></div>
    </div>
  </div>
)

function WatermarkedActivityContent({
  children,
}: {
  children: React.ReactNode
}) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const user = session?.data?.user
  const watermarkEnabled = org?.config?.config?.general?.watermark !== false

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    user?.username ||
    user?.email ||
    user?.user_uuid

  const watermarkText = [org?.name].filter(Boolean).join(' - ')

  if (!watermarkEnabled || !watermarkText) {
    return <>{children}</>
  }

  return (
    <div className="relative overflow-hidden">
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-4 z-80 max-w-[80%] select-none text-right text-xs font-bold uppercase tracking-wide text-slate-950 opacity-45 md:text-sm"
      >
        {watermarkText}
      </div>
    </div>
  )
}

interface ActivityClientProps {
  activityid: string
  courseuuid: string
  orgslug: string
  activity: any
  course: any
}

interface ActivityActionsProps {
  activity: any
  activityid: string
  course: any
  orgslug: string
  assignment: any
  showNavigation?: boolean
}

// Custom hook for activity position
function useActivityPosition(course: any, activityId: string) {
  return useMemo(() => {
    let allActivities: any[] = []
    let currentIndex = -1

    course.chapters.forEach((chapter: any) => {
      chapter.activities.forEach((activity: any) => {
        const cleanActivityUuid = activity.activity_uuid?.replace(
          'activity_',
          ''
        )
        allActivities.push({
          ...activity,
          cleanUuid: cleanActivityUuid,
          chapterName: chapter.name,
        })

        if (cleanActivityUuid === activityId.replace('activity_', '')) {
          currentIndex = allActivities.length - 1
        }
      })
    })

    return { allActivities, currentIndex }
  }, [course, activityId])
}

function getCourseTrailRun(courseUuid: string, trailData: any) {
  const cleanCourseUuid = courseUuid?.replace('course_', '')

  return trailData?.runs?.find((run: any) => {
    const runCourseUuid =
      run.course?.course_uuid || run.course_uuid || run.course?.uuid

    return runCourseUuid?.replace('course_', '') === cleanCourseUuid
  })
}

function getCompletedActivityStep(activity: any, course: any, trailData: any) {
  const run = getCourseTrailRun(course.course_uuid, trailData)

  return run?.steps?.find(
    (step: any) =>
      (step.activity_id === activity.id ||
        step.activity_uuid === activity.activity_uuid ||
        step.activity_uuid ===
          activity.activity_uuid?.replace('activity_', '')) &&
      step.complete === true
  )
}

function isActivityCompleteInRun(activity: any, run: any) {
  return run?.steps?.some(
    (step: any) =>
      (step.activity_id === activity.id ||
        step.activity_uuid === activity.activity_uuid ||
        step.activity_uuid ===
          activity.activity_uuid?.replace('activity_', '')) &&
      step.complete === true
  )
}

function isActivityLockedByProgress(
  activity: any,
  allActivities: any[],
  run: any
) {
  if (!activity?.is_locked) return false

  const activityIndex = allActivities.findIndex(
    (courseActivity: any) =>
      courseActivity.id === activity.id ||
      courseActivity.activity_uuid === activity.activity_uuid ||
      courseActivity.cleanUuid === activity.cleanUuid
  )

  if (activityIndex <= 0) return false

  return !allActivities
    .slice(0, activityIndex)
    .every((courseActivity: any) =>
      isActivityCompleteInRun(courseActivity, run)
    )
}

function getActivityPoints(activity: any) {
  const points = Number(activity?.points || 0)
  return Number.isFinite(points) ? points : 0
}

function isPrerequisiteComplete(prereq: any, trailData: any) {
  return trailData?.runs?.some((run: any) => {
    const runCourseUuid =
      run.course?.course_uuid || run.course_uuid || run.course?.uuid
    const prereqCourseUuid = prereq.prerequisite_course_uuid

    return (
      (run.course_id === prereq.prerequisite_course_id ||
        runCourseUuid === prereqCourseUuid ||
        runCourseUuid?.replace('course_', '') ===
          prereqCourseUuid?.replace('course_', '')) &&
      run.status === 'STATUS_COMPLETED'
    )
  })
}

function CourseAccessBlockedDisclaimer({
  course,
  missingPrerequisites,
  orgslug,
  reason,
}: {
  course: any
  missingPrerequisites?: any[]
  orgslug: string
  reason: 'prerequisites' | 'activity_locked'
}) {
  const hasPrerequisites =
    reason === 'prerequisites' && missingPrerequisites?.length

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-800" />
          <h3 className="font-semibold text-amber-800">
            {reason === 'prerequisites'
              ? 'Prerequisites required'
              : 'Activity locked'}
          </h3>
        </div>
        <p className="mt-1 text-sm text-amber-700">
          {reason === 'prerequisites'
            ? `Complete the required course${missingPrerequisites && missingPrerequisites.length > 1 ? 's' : ''} before accessing ${course.name}.`
            : 'Complete the previous chapter or activity before opening this content.'}
        </p>
      </div>

      {hasPrerequisites && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#13131a]">
          <p className="mb-3 text-xs font-bold uppercase text-slate-500 dark:text-white/45">
            Required before this course
          </p>
          <div className="space-y-2">
            {missingPrerequisites?.map((prereq: any) => (
              <Link
                key={prereq.id ?? prereq.prerequisite_course_id}
                href={
                  getUriWithOrg(orgslug, '') +
                  `/course/${prereq.prerequisite_course_uuid.replace(
                    'course_',
                    ''
                  )}`
                }
                className="flex items-center justify-between rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                prefetch={false}
              >
                <span className="min-w-0 truncate">
                  {prereq.prerequisite_course_name}
                </span>
                <ChevronRight size={16} className="shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityPointsSummary({
  activity,
  course,
  trailData,
}: {
  activity: any
  course: any
  trailData: any
}) {
  const assignedPoints = getActivityPoints(activity)

  if (assignedPoints <= 0) {
    return null
  }

  const completedStep = getCompletedActivityStep(activity, course, trailData)
  const hasEarnedPoints = Boolean(completedStep)
  const storedEarnedPoints = Number(completedStep?.points_earned || 0)
  const earnedPoints =
    hasEarnedPoints && storedEarnedPoints > 0
      ? storedEarnedPoints
      : assignedPoints
  const displayedPoints = hasEarnedPoints ? earnedPoints : assignedPoints

  return (
    <div
      className={`inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-[11px] font-bold uppercase sm:w-auto sm:px-4 sm:text-xs ${
        hasEarnedPoints
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300'
          : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/8 dark:bg-white/5 dark:text-white/60'
      }`}
      title={
        hasEarnedPoints
          ? `${displayedPoints}/${assignedPoints} points earned`
          : `${assignedPoints} points available`
      }
    >
      <Trophy size={16} />
      <span className="truncate">
        {hasEarnedPoints
          ? `${displayedPoints}/${assignedPoints} pts earned`
          : `0/${assignedPoints} pts earned`}
      </span>
    </div>
  )
}

function ActivityActions({
  activity,
  activityid,
  course,
  orgslug,
  assignment,
  showNavigation = true,
}: ActivityActionsProps) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // Add SWR for trail data
  const { data: trailData } = useSWR(
    `${getAPIUrl()}trail/org/${org?.id}/trail`,
    (url) => swrFetcher(url, access_token)
  )

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
      {activity &&
        activity.published == true &&
        activity.content.paid_access != false && (
          <AuthenticatedClientElement checkMethod="authentication">
            {activity.activity_type != 'TYPE_ASSIGNMENT' && (
              <>
                <MarkStatus
                  activity={activity}
                  activityid={activityid}
                  course={course}
                  orgslug={orgslug}
                  trailData={trailData}
                />
              </>
            )}
            {activity.activity_type == 'TYPE_ASSIGNMENT' && (
              <>
                <AssignmentSubmissionProvider
                  assignment_uuid={assignment?.assignment_uuid}
                >
                  <AssignmentTools
                    assignment={assignment}
                    activity={activity}
                    activityid={activityid}
                    course={course}
                    orgslug={orgslug}
                  />
                </AssignmentSubmissionProvider>
              </>
            )}
            {showNavigation && (
              <NextActivityButton
                course={course}
                currentActivityId={activity.id}
                orgslug={orgslug}
                trailData={trailData}
              />
            )}
          </AuthenticatedClientElement>
        )}
    </div>
  )
}

function ActivityClient(props: ActivityClientProps) {
  const { t } = useTranslation()
  const activityid = props.activityid

  function getRelativeTime(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)
    if (years > 0) return t('time.years_ago', { count: years })
    if (months > 0) return t('time.months_ago', { count: months })
    if (weeks > 0) return t('time.weeks_ago', { count: weeks })
    if (days > 0) return t('time.days_ago', { count: days })
    if (hours > 0) return t('time.hours_ago', { count: hours })
    if (minutes > 0) return t('time.minutes_ago', { count: minutes })
    return t('common.just_now')
  }

  const courseuuid = props.courseuuid
  const orgslug = props.orgslug
  const activity = props.activity
  const course = props.course
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [assignment, setAssignment] = useState(null) as any
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [videoWatchSatisfied, setVideoWatchSatisfied] = useState(false)
  const { contributorStatus } = useContributorStatus(courseuuid)
  const router = useRouter()

  // Heartbeat tracking
  useActivityHeartbeat(activity?.activity_uuid, access_token)

  // Add SWR for trail data
  const { data: trailData } = useSWR(
    `${getAPIUrl()}trail/org/${org?.id}/trail`,
    (url) => swrFetcher(url, access_token)
  )
  const { data: prerequisites } = useSWR<any[]>(
    course?.course_uuid
      ? `${getAPIUrl()}prerequisites/${course.course_uuid}`
      : null,
    (url: string) => swrFetcher(url, access_token)
  )
  const [loadingMarkComplete, setLoadingMarkComplete] = useState(false)

  const isActivityComplete = useCallback(
    (aId: string, cId: string, tData: any) => {
      const cleanCourseUuid = cId?.replace('course_', '')
      let run = tData?.runs?.find((run: any) => {
        const cleanRunCourseUuid = run.course?.course_uuid?.replace(
          'course_',
          ''
        )
        return cleanRunCourseUuid === cleanCourseUuid
      })

      if (run) {
        return run.steps.find(
          (step: any) =>
            (step.activity_id === aId ||
              step.activity_uuid === aId ||
              step.activity_uuid === `activity_${aId}`) &&
            step.complete === true
        )
      }
      return false
    },
    []
  )

  const handleMarkAsComplete = useCallback(
    async (aUuid: string, mark: boolean) => {
      try {
        setLoadingMarkComplete(true)
        let result
        if (mark) {
          result = await markActivityAsComplete(
            orgslug,
            courseuuid,
            aUuid,
            session.data?.tokens?.access_token
          )
        } else {
          result = await unmarkActivityAsComplete(
            orgslug,
            courseuuid,
            aUuid,
            session.data?.tokens?.access_token
          )
        }
        if (!result.success) {
          toast.error(result.error || t('activities.submission_failed'))
          return
        }
        await mutate(`${getAPIUrl()}trail/org/${org?.id}/trail`)
        toast.success(
          mark
            ? t('activities.submission_saved')
            : t('activities.unmark_success')
        )
      } catch (err) {
        toast.error(t('activities.submission_failed'))
      } finally {
        setLoadingMarkComplete(false)
      }
    },
    [orgslug, courseuuid, session.data?.tokens?.access_token, org?.id, t]
  )

  // Memoize activity position calculation
  const { allActivities, currentIndex } = useActivityPosition(
    course,
    activityid
  )

  // Get previous and next activities
  const prevActivity = currentIndex > 0 ? allActivities[currentIndex - 1] : null
  const nextActivity =
    currentIndex < allActivities.length - 1
      ? allActivities[currentIndex + 1]
      : null
  const currentTrailRun = useMemo(
    () => getCourseTrailRun(course.course_uuid, trailData),
    [course.course_uuid, trailData]
  )
  const nextActivityLocked = isActivityLockedByProgress(
    nextActivity,
    allActivities,
    currentTrailRun
  )

  // Memoize activity content
  const activityContent = useMemo(() => {
    if (
      !activity ||
      !activity.published ||
      activity.content.paid_access === false
    ) {
      return null
    }

    switch (activity.activity_type) {
      case 'TYPE_DYNAMIC':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <Canva content={activity.content} activity={activity} />
          </Suspense>
        )
      case 'TYPE_VIDEO':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <VideoActivity
              course={course}
              activity={activity}
              enforceLinearPlayback={
                activity.activity_sub_type === 'SUBTYPE_VIDEO_HOSTED'
              }
              isCompleted={
                !!isActivityComplete(
                  activity.activity_uuid,
                  course.course_uuid,
                  trailData
                )
              }
              onComplete={() => {
                setVideoWatchSatisfied(true)
                if (
                  !isActivityComplete(
                    activity.activity_uuid,
                    course.course_uuid,
                    trailData
                  )
                ) {
                  handleMarkAsComplete(activity.activity_uuid, true)
                }
              }}
              onWatchSatisfied={() => setVideoWatchSatisfied(true)}
            />
          </Suspense>
        )
      case 'TYPE_DOCUMENT':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <DocumentPdfActivity course={course} activity={activity} />
          </Suspense>
        )
      case 'TYPE_SMART_ARTICLE':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <SmartArticleActivity
              course={course}
              activity={activity}
              isFocusMode={false}
              onComplete={() =>
                handleMarkAsComplete(activity.activity_uuid, true)
              }
              isCompleted={
                !!isActivityComplete(
                  activity.activity_uuid,
                  course.course_uuid,
                  trailData
                )
              }
            />
          </Suspense>
        )
      case 'TYPE_ASSIGNMENT':
        return assignment &&
          assignment?.assignment_uuid &&
          assignment?.assignment_uuid !== 'undefined' ? (
          <Suspense fallback={<LoadingFallback />}>
            <AssignmentProvider assignment_uuid={assignment?.assignment_uuid}>
              <AssignmentsTaskProvider>
                <AssignmentSubmissionProvider
                  assignment_uuid={assignment?.assignment_uuid}
                >
                  <AssignmentStudentActivity isFocusMode={false} />
                </AssignmentSubmissionProvider>
              </AssignmentsTaskProvider>
            </AssignmentProvider>
          </Suspense>
        ) : (
          <LoadingFallback />
        )
      case 'TYPE_LIVE_SESSION':
        return (
          <Suspense fallback={<LoadingFallback />}>
            <LiveSessionActivity
              course={course}
              activity={activity}
              isFocusMode={false}
              onFocusModeChange={() => {}}
            />
          </Suspense>
        )
      default:
        return null
    }
  }, [
    activity,
    course,
    assignment,
    handleMarkAsComplete,
    isActivityComplete,
    trailData,
    setVideoWatchSatisfied,
  ])

  // Navigate to an activity
  const navigateToActivity = (activity: any) => {
    const cleanCourseUuid = course.course_uuid?.replace('course_', '')

    if (activity === 'end') {
      router.push(
        getUriWithOrg(orgslug, '') + `/course/${cleanCourseUuid}/activity/end`
      )
      return
    }

    if (!activity) return
    if (isActivityLockedByProgress(activity, allActivities, currentTrailRun)) {
      toast.error('Complete the previous activity before continuing.')
      return
    }

    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${activity.cleanUuid}`
    )
  }

  // Initialize focus mode as an optional viewing mode.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasMounted(true)
    }
  }, [])

  useEffect(() => {
    setVideoWatchSatisfied(false)
  }, [activity?.activity_uuid])

  // Save focus mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('globalFocusMode', isFocusMode.toString())
      // Dispatch custom event for focus mode change
      window.dispatchEvent(
        new CustomEvent('focusModeChange', {
          detail: { isFocusMode },
        })
      )
    }
  }, [isFocusMode])

  function getChapterNameByActivityId(course: any, activity_id: any) {
    for (let i = 0; i < course.chapters.length; i++) {
      let chapter = course.chapters[i]
      for (let j = 0; j < chapter.activities.length; j++) {
        let activity = chapter.activities[j]
        if (activity.id === activity_id) {
          // Check if chapter name already starts with "Chapter" to avoid redundant "Chapter 1 : Chapter 1: ..."
          const cleanChapterName = chapter.name.replace(
            /^(Chapter|CHAPTER|chapter)\s*\d+\s*[:-]*\s*/,
            ''
          )
          return `${t('courses.chapter')} ${i + 1} : ${cleanChapterName}`
        }
      }
    }
    return null // return null if no matching activity is found
  }

  const getAssignmentUI = useCallback(async () => {
    const assignment = await getAssignmentFromActivityUUID(
      activity.activity_uuid,
      access_token
    )
    setAssignment(assignment.data)
  }, [activity.activity_uuid, access_token, setAssignment])

  // Derive bgColor based on activity type and focus mode
  const bgColor = useMemo(() => {
    if (isFocusMode) {
      if (activity.activity_type == 'TYPE_SMART_ARTICLE')
        return 'bg-transparent'
      return 'bg-zinc-900/50 backdrop-blur-xl border border-white/10'
    }

    if (activity.activity_type == 'TYPE_DYNAMIC') {
      return 'bg-white nice-shadow'
    } else if (activity.activity_type == 'TYPE_ASSIGNMENT') {
      return 'bg-white nice-shadow'
    } else {
      return 'bg-zinc-950 nice-shadow'
    }
  }, [activity.activity_type, isFocusMode])

  const fallbackTotalActivities = useMemo(
    () =>
      course.chapters?.reduce(
        (acc: number, chapter: any) => acc + (chapter.activities?.length || 0),
        0
      ) || 0,
    [course.chapters]
  )

  const totalActivities =
    currentTrailRun?.course_total_steps || fallbackTotalActivities

  const completedActivities =
    currentTrailRun?.steps?.filter((step: any) => step.complete === true)
      .length || 0

  const canBypassLearnerGates = contributorStatus === 'ACTIVE'
  const missingPrerequisites = useMemo(() => {
    if (canBypassLearnerGates || activityid === 'end') return []
    if (!prerequisites) return []

    return prerequisites.filter(
      (prereq: any) => !isPrerequisiteComplete(prereq, trailData)
    )
  }, [activityid, canBypassLearnerGates, prerequisites, trailData])
  const hasPrerequisiteGate = missingPrerequisites.length > 0
  const isCurrentActivityLocked =
    !canBypassLearnerGates &&
    activityid !== 'end' &&
    Boolean(activity?.is_locked)
  const isActivityAccessBlocked = hasPrerequisiteGate || isCurrentActivityLocked

  const progressPercentage =
    totalActivities > 0
      ? Math.min(100, Math.round((completedActivities / totalActivities) * 100))
      : 0

  useEffect(() => {
    if (activity.activity_type == 'TYPE_ASSIGNMENT') {
      getAssignmentUI()
    }
  }, [activity.activity_type, getAssignmentUI])

  useEffect(() => {
    if (isActivityAccessBlocked && isFocusMode) {
      setIsFocusMode(false)
    }
  }, [isActivityAccessBlocked, isFocusMode])

  return (
    <>
      {/* Full viewport for Live Sessions in focus mode */}
      <AnimatePresence mode="wait">
        {activity?.activity_type === 'TYPE_LIVE_SESSION' &&
          isFocusMode &&
          !isActivityAccessBlocked && (
            <motion.div
              key="live-focus-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-900 z-50 overflow-hidden"
            >
              <Suspense fallback={<LoadingFallback />}>
                <LiveSessionActivity
                  course={course}
                  activity={activity}
                  isFocusMode={isFocusMode}
                  onFocusModeChange={setIsFocusMode}
                />
              </Suspense>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Normal flow for other activities and non-focus Live Sessions */}
      {!(
        activity?.activity_type === 'TYPE_LIVE_SESSION' &&
        isFocusMode &&
        !isActivityAccessBlocked
      ) && (
        <>
          <CourseProvider courseuuid={course?.course_uuid}>
            <Suspense fallback={<LoadingFallback />}>
              <AIChatBotProvider>
                {isFocusMode && !isActivityAccessBlocked ? (
                  <AnimatePresence>
                    {/* Check if it's a Smart Article to hide standard Focus Mode bars */}
                    {(() => {
                      const isSmartArticle =
                        activity?.activity_type === 'TYPE_SMART_ARTICLE'
                      return (
                        <motion.div
                          key="focus-mode-container"
                          initial={!hasMounted ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="fixed inset-0 bg-zinc-900 z-50 overflow-hidden"
                        >
                          {/* Premium Doodle Background Overlay */}
                          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(24,24,27,0.5)_100%)]" />
                            <div
                              className="absolute inset-0 opacity-5"
                              style={{
                                backgroundImage: "url('/edu_bg.png')",
                                backgroundSize: '350px',
                                backgroundRepeat: 'repeat',
                                mixBlendMode: 'screen',
                              }}
                            />
                          </div>
                          {/* Only show standard Top Bar if NOT a Smart Article */}
                          {!isSmartArticle && (
                            <motion.div
                              initial={!hasMounted ? false : { y: -100 }}
                              animate={{ y: 0 }}
                              exit={{ y: -100 }}
                              transition={{ duration: 0.3 }}
                              className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5"
                            >
                              <div className="container mx-auto px-3 py-2 sm:px-4">
                                <div className="flex min-h-14 flex-wrap items-center justify-between gap-3">
                                  {/* Progress Indicator - Moved to left */}
                                  <motion.div
                                    initial={
                                      !hasMounted
                                        ? false
                                        : { opacity: 0, x: -20 }
                                    }
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex items-center space-x-2"
                                  >
                                    <div className="relative w-8 h-8">
                                      <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                          cx="16"
                                          cy="16"
                                          r="14"
                                          stroke="#27272a"
                                          strokeWidth="3"
                                          fill="none"
                                        />
                                        <circle
                                          cx="16"
                                          cy="16"
                                          r="14"
                                          stroke="#10b981"
                                          strokeWidth="3"
                                          fill="none"
                                          strokeLinecap="round"
                                          strokeDasharray={2 * Math.PI * 14}
                                          strokeDashoffset={
                                            2 *
                                            Math.PI *
                                            14 *
                                            (1 -
                                              (trailData?.runs
                                                ?.find(
                                                  (run: any) =>
                                                    run.course_uuid ===
                                                    course.course_uuid
                                                )
                                                ?.steps?.filter(
                                                  (step: any) => step.complete
                                                )?.length || 0) /
                                                (course.chapters?.reduce(
                                                  (acc: number, chapter: any) =>
                                                    acc +
                                                    chapter.activities.length,
                                                  0
                                                ) || 1))
                                          }
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-bold text-zinc-400">
                                          {Math.round(
                                            ((trailData?.runs
                                              ?.find(
                                                (run: any) =>
                                                  run.course_uuid ===
                                                  course.course_uuid
                                              )
                                              ?.steps?.filter(
                                                (step: any) => step.complete
                                              )?.length || 0) /
                                              (course.chapters?.reduce(
                                                (acc: number, chapter: any) =>
                                                  acc +
                                                  chapter.activities.length,
                                                0
                                              ) || 1)) *
                                              100
                                          )}
                                          %
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      {trailData?.runs
                                        ?.find(
                                          (run: any) =>
                                            run.course_uuid ===
                                            course.course_uuid
                                        )
                                        ?.steps?.filter(
                                          (step: any) => step.complete
                                        )?.length || 0}{' '}
                                      {t('common.of')}{' '}
                                      {course.chapters?.reduce(
                                        (acc: number, chapter: any) =>
                                          acc + chapter.activities.length,
                                        0
                                      ) || 0}
                                    </div>
                                  </motion.div>

                                  {/* Center Course Info */}
                                  <motion.div
                                    initial={
                                      !hasMounted
                                        ? false
                                        : { opacity: 0, y: -20 }
                                    }
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex min-w-0 items-center space-x-3 sm:space-x-4"
                                  >
                                    <div className="flex">
                                      <Link
                                        href={
                                          getUriWithOrg(orgslug, '') +
                                          `/course/${courseuuid}`
                                        }
                                      >
                                        <NextImage
                                          className="w-[60px] h-[34px] rounded-md drop-shadow-md"
                                          src={`${getCourseThumbnailMediaDirectory(
                                            org?.org_uuid,
                                            course.course_uuid,
                                            course.thumbnail_image
                                          )}`}
                                          alt=""
                                          width={800}
                                          height={800}
                                        />
                                      </Link>
                                    </div>
                                    <div className="flex flex-col min-w-0 -space-y-0.5">
                                      <p className="font-bold text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-wider truncate">
                                        {t('search.course')}
                                      </p>
                                      <h1 className="font-bold text-white text-sm md:text-md first-letter:uppercase truncate max-w-[120px] md:max-w-xs">
                                        {course.name}
                                      </h1>
                                    </div>
                                  </motion.div>

                                  {/* Completion & Navigation - Moved to right */}
                                  <motion.div
                                    initial={
                                      !hasMounted
                                        ? false
                                        : { opacity: 0, x: 20 }
                                    }
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:space-x-3"
                                  >
                                    <ActivityStatusBadge
                                      activity={activity}
                                      course={course}
                                      trailData={trailData}
                                    />

                                    <button
                                      onClick={() =>
                                        handleMarkAsComplete(
                                          activity.activity_uuid,
                                          !isActivityComplete(
                                            activity.activity_uuid,
                                            course.course_uuid,
                                            trailData
                                          )
                                        )
                                      }
                                      className={`min-w-0 px-3 py-2 sm:px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all min-h-[36px] flex items-center justify-center shadow-lg ${
                                        isActivityComplete(
                                          activity.activity_uuid,
                                          course.course_uuid,
                                          trailData
                                        )
                                          ? 'bg-zinc-800 text-teal-400 border border-teal-500/20'
                                          : 'bg-white text-zinc-950 hover:bg-zinc-100 hover:scale-105 active:scale-95'
                                      }`}
                                    >
                                      {loadingMarkComplete ? (
                                        <Loader2
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : isActivityComplete(
                                          activity.activity_uuid,
                                          course.course_uuid,
                                          trailData
                                        ) ? (
                                        <span className="flex min-w-0 items-center gap-2">
                                          <CheckCircle size={14} />
                                          <span className="truncate">
                                            {t('activities.completed')}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="truncate">
                                          {t('activities.mark_as_complete')}
                                        </span>
                                      )}
                                    </button>

                                    <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

                                    <ActivityChapterDropdown
                                      course={course}
                                      currentActivityId={
                                        activity.activity_uuid
                                          ? activity.activity_uuid.replace(
                                              'activity_',
                                              ''
                                            )
                                          : activityid.replace('activity_', '')
                                      }
                                      orgslug={orgslug}
                                      trailData={trailData}
                                    />

                                    {/* Exit Focus Mode button */}
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setIsFocusMode(false)}
                                      className="bg-white/5 border border-white/10 p-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors"
                                      title={t('activities.exit_focus_mode')}
                                    >
                                      <Minimize2
                                        size={16}
                                        className="text-white"
                                      />
                                    </motion.button>
                                  </motion.div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Floating Minimize Button for Smart Articles */}
                          {isSmartArticle && (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setIsFocusMode(false)}
                              className="fixed top-6 left-6 z-60 p-3 rounded-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-white shadow-2xl hover:bg-zinc-800 transition-all flex items-center group overflow-hidden"
                              title={t('activities.exit_focus_mode')}
                            >
                              <Minimize2 size={18} />
                              <span className="max-w-0 group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100">
                                {t('activities.exit_focus_mode')}
                              </span>
                            </motion.button>
                          )}

                          {/* Focus Mode Content */}
                          <div
                            className={`${isSmartArticle ? 'pt-0 pb-0 h-screen' : 'pt-16 pb-24 md:pb-16 h-full'} overflow-x-hidden overflow-y-auto relative scrollbar-hide`}
                          >
                            {/* Floating Navigation Arrows - Hidden on Mobile */}
                            {!isSmartArticle && (
                              <div className="hidden md:block">
                                <motion.button
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{
                                    opacity: prevActivity ? 1 : 0,
                                    x: 0,
                                  }}
                                  whileHover={{ x: -2 }}
                                  onClick={() =>
                                    navigateToActivity(prevActivity)
                                  }
                                  disabled={!prevActivity}
                                  className={`fixed left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/10 text-white transition-all shadow-2xl ${
                                    prevActivity
                                      ? 'hover:bg-zinc-800 hover:scale-110'
                                      : 'hidden'
                                  }`}
                                  title={
                                    prevActivity
                                      ? `${t('common.previous')}: ${prevActivity.name}`
                                      : ''
                                  }
                                >
                                  <ChevronLeft size={24} />
                                </motion.button>

                                <motion.button
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{
                                    opacity: 1,
                                    x: 0,
                                  }}
                                  whileHover={{ x: 2 }}
                                  onClick={() =>
                                    !nextActivityLocked &&
                                    navigateToActivity(nextActivity || 'end')
                                  }
                                  disabled={nextActivityLocked}
                                  className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/10 text-white transition-all shadow-2xl ${
                                    nextActivityLocked
                                      ? 'cursor-not-allowed opacity-45'
                                      : 'hover:bg-zinc-800 hover:scale-110'
                                  } ${
                                    !nextActivity && !nextActivityLocked
                                      ? 'border-emerald-500/50 text-emerald-400'
                                      : ''
                                  }`}
                                  title={
                                    nextActivity
                                      ? nextActivityLocked
                                        ? 'Complete the previous activity before continuing'
                                        : `${t('common.next')}: ${nextActivity.name}`
                                      : t('courses.finish_course')
                                  }
                                >
                                  {nextActivityLocked ? (
                                    <Lock size={24} />
                                  ) : nextActivity ? (
                                    <ChevronRight size={24} />
                                  ) : (
                                    <Trophy size={24} />
                                  )}
                                </motion.button>
                              </div>
                            )}

                            <div
                              className={`${activity?.activity_type === 'TYPE_VIDEO' ? 'max-w-5xl' : isSmartArticle ? 'max-w-full' : 'max-w-(--breakpoint-xl)'} mx-auto ${isSmartArticle ? 'px-0' : 'px-4 mb-20'}`}
                            >
                              {activityid === 'end' ? (
                                <div className="mt-8">
                                  <CourseEndView
                                    courseName={course.name}
                                    orgslug={orgslug}
                                    courseUuid={course.course_uuid}
                                    thumbnailImage={course.thumbnail_image}
                                    course={course}
                                    trailData={trailData}
                                  />
                                </div>
                              ) : (
                                activity &&
                                activity.published == true && (
                                  <>
                                    {activity.content.paid_access == false ? (
                                      <PaidCourseActivityDisclaimer
                                        course={course}
                                      />
                                    ) : isActivityAccessBlocked ? (
                                      <CourseAccessBlockedDisclaimer
                                        course={course}
                                        missingPrerequisites={
                                          missingPrerequisites
                                        }
                                        orgslug={orgslug}
                                        reason={
                                          hasPrerequisiteGate
                                            ? 'prerequisites'
                                            : 'activity_locked'
                                        }
                                      />
                                    ) : (
                                      <motion.div
                                        initial={
                                          !hasMounted
                                            ? false
                                            : { scale: 0.95, opacity: 0, y: 20 }
                                        }
                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                        transition={{
                                          delay: 0.3,
                                          type: 'spring',
                                          stiffness: 100,
                                          damping: 20,
                                        }}
                                        className={`rounded-2xl ${bgColor} ${isSmartArticle ? 'mt-0' : 'mt-4 md:mt-8 p-3 md:p-8 shadow-2xl border border-white/5'}`}
                                      >
                                        {/* Activity Types */}
                                        <div
                                          className="relative z-10 w-full overflow-visible"
                                          style={{
                                            userSelect: 'none',
                                            WebkitUserSelect: 'none',
                                          }}
                                        >
                                          <WatermarkedActivityContent>
                                            {activityContent}
                                          </WatermarkedActivityContent>
                                        </div>
                                      </motion.div>
                                    )}
                                  </>
                                )
                              )}
                            </div>
                          </div>

                          {/* Mobile Navigation Bar - Visible only on Mobile */}
                          {!isSmartArticle && (
                            <motion.div
                              initial={{ y: 100 }}
                              animate={{ y: 0 }}
                              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-t border-white/5 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex items-center justify-between"
                            >
                              <button
                                onClick={() => navigateToActivity(prevActivity)}
                                disabled={!prevActivity}
                                className={`flex flex-col items-center gap-1 transition-all ${
                                  prevActivity
                                    ? 'text-white'
                                    : 'text-zinc-600 opacity-50'
                                }`}
                              >
                                <ChevronLeft size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {t('common.previous')}
                                </span>
                              </button>

                              <div className="h-8 w-px bg-white/10" />

                              <button
                                onClick={() =>
                                  !nextActivityLocked &&
                                  navigateToActivity(nextActivity || 'end')
                                }
                                disabled={nextActivityLocked}
                                className={`flex flex-col items-center gap-1 transition-all ${
                                  nextActivityLocked
                                    ? 'cursor-not-allowed text-zinc-600 opacity-50'
                                    : nextActivity
                                      ? 'text-white'
                                      : 'text-emerald-400'
                                }`}
                              >
                                {nextActivityLocked ? (
                                  <Lock size={20} />
                                ) : nextActivity ? (
                                  <ChevronRight size={20} />
                                ) : (
                                  <Trophy size={20} />
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {nextActivityLocked
                                    ? 'Locked'
                                    : nextActivity
                                      ? t('common.next')
                                      : t('courses.finish')}
                                </span>
                              </button>
                            </motion.div>
                          )}

                          {/* Bottom actions removed to avoid video occlusion */}
                        </motion.div>
                      )
                    })()}
                  </AnimatePresence>
                ) : (
                  <div className="min-h-screen bg-[#f7f9fc] dark:bg-[#0f0f13]">
                    {activityid === 'end' ? (
                      <div className="mx-auto max-w-5xl px-4 py-8">
                        <CourseEndView
                          courseName={course.name}
                          orgslug={orgslug}
                          courseUuid={course.course_uuid}
                          thumbnailImage={course.thumbnail_image}
                          course={course}
                          trailData={trailData}
                        />
                      </div>
                    ) : (
                      <div className="min-h-screen">
                        <ActivityPageNavbar
                          activity={activity}
                          activityid={activityid}
                          assignment={assignment}
                          contributorStatus={contributorStatus}
                          course={course}
                          courseuuid={courseuuid}
                          handleMarkAsComplete={handleMarkAsComplete}
                          isActivityComplete={isActivityComplete}
                          loadingMarkComplete={loadingMarkComplete}
                          org={org}
                          orgslug={orgslug}
                          progressPercentage={progressPercentage}
                          trailData={trailData}
                          videoWatchSatisfied={videoWatchSatisfied}
                        />

                        <div className="flex min-h-[calc(100vh-73px)] flex-col lg:flex-row">
                          <CourseContentSidebar
                            course={course}
                            currentActivityId={
                              activity?.activity_uuid
                                ? activity.activity_uuid.replace(
                                    'activity_',
                                    ''
                                  )
                                : activityid.replace('activity_', '')
                            }
                            orgslug={orgslug}
                            trailData={trailData}
                          />

                          <main className="min-w-0 flex-1">
                            <div
                              className={`py-5 sm:px-6 xl:px-8 ${
                                activity?.activity_type === 'TYPE_ASSIGNMENT'
                                  ? 'px-0 pb-32 md:px-4 md:pb-5'
                                  : 'px-4'
                              }`}
                            >
                              {activity && activity.published == false && (
                                <div className="rounded-lg border border-slate-200 bg-slate-900 p-7 text-white shadow-sm">
                                  <h1 className="text-2xl font-bold">
                                    {t('activities.not_published_yet')}
                                  </h1>
                                </div>
                              )}

                              {activity && activity.published == true && (
                                <>
                                  {activity.content.paid_access == false ? (
                                    <PaidCourseActivityDisclaimer
                                      course={course}
                                    />
                                  ) : isActivityAccessBlocked ? (
                                    <CourseAccessBlockedDisclaimer
                                      course={course}
                                      missingPrerequisites={
                                        missingPrerequisites
                                      }
                                      orgslug={orgslug}
                                      reason={
                                        hasPrerequisiteGate
                                          ? 'prerequisites'
                                          : 'activity_locked'
                                      }
                                    />
                                  ) : (
                                    <>
                                      <div className="mb-4 flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase text-slate-500 dark:text-white/40">
                                        <Link
                                          href={
                                            getUriWithOrg(orgslug, '') +
                                            `/course/${courseuuid}`
                                          }
                                          className="truncate hover:text-slate-900 dark:hover:text-white"
                                        >
                                          {course.name}
                                        </Link>
                                        <ChevronRight
                                          size={14}
                                          className="shrink-0 text-slate-300 dark:text-white/20"
                                        />
                                        <span className="truncate text-slate-800 dark:text-white/75">
                                          {activity?.name}
                                        </span>
                                      </div>

                                      <div
                                        className={`activity-info-section ${
                                          activity.activity_type ===
                                          'TYPE_ASSIGNMENT'
                                            ? 'bg-transparent shadow-none md:rounded-lg md:border md:border-slate-200 md:bg-white md:shadow-sm md:dark:border-white/8 md:dark:bg-[#13131a]'
                                            : 'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/8 dark:bg-[#13131a]'
                                        }`}
                                      >
                                        <div
                                          className={`relative mx-auto ${
                                            activity.activity_type ===
                                            'TYPE_VIDEO'
                                              ? 'max-w-5xl'
                                              : activity.activity_type ===
                                                  'TYPE_SMART_ARTICLE'
                                                ? 'max-w-full'
                                                : 'max-w-6xl'
                                          }`}
                                          style={{
                                            userSelect: 'none',
                                            WebkitUserSelect: 'none',
                                          }}
                                        >
                                          <WatermarkedActivityContent>
                                            {activityContent}
                                          </WatermarkedActivityContent>
                                        </div>
                                      </div>

                                      {activity.activity_type ===
                                        'TYPE_ASSIGNMENT' && (
                                        <div className="mt-4 hidden justify-end rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#13131a] md:flex">
                                          <AssignmentSubmissionProvider
                                            assignment_uuid={
                                              assignment?.assignment_uuid
                                            }
                                          >
                                            <AssignmentTools
                                              assignment={assignment}
                                              activity={activity}
                                              activityid={activityid}
                                              course={course}
                                              orgslug={orgslug}
                                            />
                                          </AssignmentSubmissionProvider>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </>
                              )}

                              {activity &&
                                activity.published == true &&
                                activity.content.paid_access != false &&
                                !isActivityAccessBlocked && (
                                  <div
                                    className={`mt-4 gap-3 md:flex-row md:items-center md:justify-between ${
                                      activity.activity_type ===
                                      'TYPE_ASSIGNMENT'
                                        ? 'hidden md:flex'
                                        : 'flex'
                                    }`}
                                  >
                                    <PreviousActivityButton
                                      course={course}
                                      currentActivityId={activity.id}
                                      orgslug={orgslug}
                                    />
                                    <NextActivityButton
                                      course={course}
                                      currentActivityId={activity.id}
                                      orgslug={orgslug}
                                      trailData={trailData}
                                    />
                                  </div>
                                )}

                              {activity &&
                                activity.published == true &&
                                activity.content.paid_access != false &&
                                !isActivityAccessBlocked &&
                                activity.activity_type ===
                                  'TYPE_ASSIGNMENT' && (
                                  <MobileAssignmentActionDock
                                    assignment={assignment}
                                    activity={activity}
                                    activityid={activityid}
                                    course={course}
                                    orgslug={orgslug}
                                    trailData={trailData}
                                  />
                                )}

                              <div className="h-12" />
                            </div>
                          </main>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </AIChatBotProvider>
            </Suspense>
          </CourseProvider>
        </>
      )}
    </>
  )
}

function ActivityPageNavbar({
  activity,
  activityid,
  assignment,
  contributorStatus,
  course,
  courseuuid,
  handleMarkAsComplete,
  isActivityComplete,
  loadingMarkComplete,
  org,
  orgslug,
  progressPercentage,
  trailData,
  videoWatchSatisfied,
}: {
  activity: any
  activityid: string
  assignment: any
  contributorStatus: string | undefined
  course: any
  courseuuid: string
  handleMarkAsComplete: (activityUuid: string, mark: boolean) => void
  isActivityComplete: (
    activityUuid: string,
    courseUuid: string,
    trailData: any
  ) => any
  loadingMarkComplete: boolean
  org: any
  orgslug: string
  progressPercentage: number
  trailData: any
  videoWatchSatisfied: boolean
}) {
  const { t } = useTranslation()
  const cleanCourseUuid = course.course_uuid?.replace('course_', '')
  const activityComplete = isActivityComplete(
    activity.activity_uuid,
    course.course_uuid,
    trailData
  )
  const requiresVideoWatch =
    activity.activity_type === 'TYPE_VIDEO' &&
    activity.activity_sub_type === 'SUBTYPE_VIDEO_HOSTED' &&
    !videoWatchSatisfied &&
    !activityComplete

  return (
    <div className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-white/8 dark:bg-[#13131a]/95">
      <div className="px-4 py-3 sm:px-6 xl:px-8">
        <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center lg:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href={getUriWithOrg(orgslug, '') + `/course/${cleanCourseUuid}`}
              className="hidden shrink-0 bg-white p-1 shadow-xs dark:bg-transparent sm:block"
            >
              <NextImage
                className="h-9 w-auto max-w-32 object-contain"
                src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                alt=""
                width={800}
                height={800}
              />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-white/45 sm:text-xs sm:normal-case">
                  {t('courses.course_progress')}
                </p>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-1.5 w-full max-w-72 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10 sm:h-2 lg:max-w-80">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-white/70 sm:text-xs">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {activity &&
            activity.published == true &&
            activity.content.paid_access != false && (
              <AuthenticatedClientElement checkMethod="authentication">
                <div className="grid w-full grid-cols-2 items-center gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,max-content))] sm:justify-end lg:flex lg:w-auto lg:flex-nowrap">
                  {/* {activity.activity_type !== 'TYPE_SMART_ARTICLE' && (
                    <AIActivityAsk activity={activity} />
                  )} */}

                  {contributorStatus === 'ACTIVE' &&
                    activity.activity_type == 'TYPE_DYNAMIC' && (
                      <Link
                        href={
                          getUriWithOrg(orgslug, '') +
                          `/course/${courseuuid}/activity/${activityid}/edit`
                        }
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15 sm:w-auto sm:px-4 sm:text-xs"
                      >
                        <Edit2 size={16} />
                        {t('courses.contribute')}
                      </Link>
                    )}

                  {activity.activity_type === 'TYPE_ASSIGNMENT' && (
                    <AssignmentSubmissionProvider
                      assignment_uuid={assignment?.assignment_uuid}
                    >
                      <AssignmentTools
                        assignment={assignment}
                        activity={activity}
                        activityid={activityid}
                        course={course}
                        orgslug={orgslug}
                      />
                    </AssignmentSubmissionProvider>
                  )}

                  <ActivityPointsSummary
                    activity={activity}
                    course={course}
                    trailData={trailData}
                  />

                  <button
                    onClick={() =>
                      handleMarkAsComplete(
                        activity.activity_uuid,
                        !activityComplete
                      )
                    }
                    disabled={loadingMarkComplete || requiresVideoWatch}
                    className={`col-span-2 inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-md border px-3 text-[11px] font-bold uppercase transition sm:col-auto sm:min-w-48 sm:px-4 sm:text-xs ${
                      activityComplete
                        ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/15'
                        : 'border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/8 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {loadingMarkComplete ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : activityComplete ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Circle size={16} />
                    )}
                    {requiresVideoWatch
                      ? 'Watch video to complete'
                      : activityComplete
                        ? t('common.completed')
                        : t('activities.mark_as_complete')}
                  </button>
                </div>
              </AuthenticatedClientElement>
            )}
        </div>
      </div>
    </div>
  )
}

function CourseContentSidebar({
  course,
  currentActivityId,
  orgslug,
  trailData,
}: {
  course: any
  currentActivityId: string
  orgslug: string
  trailData: any
}) {
  const { t } = useTranslation()
  const cleanCourseUuid = course.course_uuid?.replace('course_', '')
  const currentActivity = useMemo(() => {
    const cleanCurrentActivityId = currentActivityId.replace('activity_', '')

    for (const chapter of course.chapters || []) {
      const activity = chapter.activities?.find(
        (chapterActivity: any) =>
          chapterActivity.activity_uuid?.replace('activity_', '') ===
          cleanCurrentActivityId
      )

      if (activity) return activity
    }

    return null
  }, [course.chapters, currentActivityId])
  const currentChapterKey = useMemo(() => {
    const cleanCurrentActivityId = currentActivityId.replace('activity_', '')

    const currentChapterIndex = course.chapters?.findIndex((chapter: any) =>
      chapter.activities?.some(
        (chapterActivity: any) =>
          chapterActivity.activity_uuid?.replace('activity_', '') ===
          cleanCurrentActivityId
      )
    )

    if (currentChapterIndex === undefined || currentChapterIndex < 0) {
      return course.chapters?.[0]?.id ?? 0
    }

    return course.chapters?.[currentChapterIndex]?.id ?? currentChapterIndex
  }, [course.chapters, currentActivityId])
  const [openChapterKey, setOpenChapterKey] = useState<any>(currentChapterKey)
  const [isMobileContentOpen, setIsMobileContentOpen] = useState(false)
  const run = trailData?.runs?.find((run: any) => {
    const runCourseUuid =
      run.course?.course_uuid || run.course_uuid || run.course?.uuid
    return runCourseUuid?.replace('course_', '') === cleanCourseUuid
  })
  const sidebarActivities = useMemo(() => {
    const activities: any[] = []

    course.chapters?.forEach((chapter: any) => {
      chapter.activities?.forEach((activity: any) => {
        activities.push({
          ...activity,
          cleanUuid: activity.activity_uuid?.replace('activity_', ''),
        })
      })
    })

    return activities
  }, [course.chapters])

  useEffect(() => {
    setOpenChapterKey(currentChapterKey)
  }, [currentChapterKey])

  const isComplete = (activity: any) =>
    run?.steps?.some(
      (step: any) =>
        (step.activity_id === activity.id ||
          step.activity_uuid === activity.activity_uuid ||
          step.activity_uuid ===
            activity.activity_uuid?.replace('activity_', '')) &&
        step.complete === true
    )

  const getActivityMeta = (activityType: string) => {
    switch (activityType) {
      case 'TYPE_VIDEO':
        return { icon: Video, label: t('activities.video') }
      case 'TYPE_DOCUMENT':
        return { icon: FileText, label: t('activities.document') }
      case 'TYPE_DYNAMIC':
        return { icon: StickyNote, label: t('activities.page') }
      case 'TYPE_ASSIGNMENT':
        return { icon: Backpack, label: t('activities.assignment') }
      case 'TYPE_LIVE_SESSION':
        return { icon: Radio, label: t('activities.learning_material') }
      case 'TYPE_SMART_ARTICLE':
        return { icon: BookOpenCheck, label: t('activities.learning_material') }
      default:
        return { icon: FileText, label: t('activities.learning_material') }
    }
  }

  const chapterList = (
    <div className="scrollbar-hide max-h-[70vh] overflow-y-auto py-3 lg:max-h-none lg:overflow-visible">
      {course.chapters?.map((chapter: any, index: number) => {
        const chapterKey = chapter.id ?? index
        const isOpen = openChapterKey === chapterKey
        const firstChapterActivity = chapter.activities?.[0]
        const isChapterLocked = firstChapterActivity
          ? isActivityLockedByProgress(
              firstChapterActivity,
              sidebarActivities,
              run
            )
          : Boolean(chapter.is_locked)

        return (
          <section
            key={chapterKey}
            className="border-b border-slate-100 pb-3 dark:border-white/8"
          >
            <button
              type="button"
              onClick={() =>
                setOpenChapterKey((currentKey: any) =>
                  currentKey === chapterKey ? null : chapterKey
                )
              }
              aria-expanded={isOpen}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isChapterLocked
                    ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {isChapterLocked ? <Lock size={13} /> : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={`line-clamp-2 text-sm font-bold uppercase leading-5 ${
                    isChapterLocked
                      ? 'text-slate-400 dark:text-white/35'
                      : 'text-slate-900 dark:text-white/85'
                  }`}
                >
                  {chapter.name}
                </h3>
              </div>
              <ChevronDown
                size={18}
                className={`mt-1 shrink-0 text-slate-500 transition-transform dark:text-white/45 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="space-y-1">
                {chapter.activities?.map((chapterActivity: any) => {
                  const cleanActivityUuid =
                    chapterActivity.activity_uuid?.replace('activity_', '')
                  const isCurrent =
                    cleanActivityUuid ===
                    currentActivityId.replace('activity_', '')
                  const complete = isComplete(chapterActivity)
                  const isLocked = isActivityLockedByProgress(
                    chapterActivity,
                    sidebarActivities,
                    run
                  )
                  const activityMeta = getActivityMeta(
                    chapterActivity.activity_type
                  )
                  const ActivityIcon = activityMeta.icon

                  const rowContent = (
                    <div
                      className={`group flex gap-3 border-l-2 px-4 py-3 transition ${
                        isLocked
                          ? 'border-transparent bg-slate-50/70 opacity-70 dark:bg-white/5'
                          : isCurrent
                            ? 'border-blue-600 bg-blue-50 dark:bg-indigo-500/15'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                        {isLocked ? (
                          <Lock
                            size={16}
                            className="text-slate-300 dark:text-white/20"
                            strokeWidth={2.5}
                          />
                        ) : complete ? (
                          <CheckCircle
                            size={17}
                            className="text-teal-600"
                            strokeWidth={2.5}
                          />
                        ) : (
                          <Circle
                            size={12}
                            className={
                              isCurrent
                                ? 'text-blue-600 dark:text-indigo-300'
                                : 'text-slate-300 dark:text-white/20'
                            }
                            fill={isCurrent ? 'currentColor' : 'none'}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`line-clamp-2 text-sm font-semibold leading-5 ${
                              isLocked
                                ? 'text-slate-400 dark:text-white/35'
                                : isCurrent
                                  ? 'text-slate-950 dark:text-white'
                                  : 'text-slate-700 dark:text-white/65'
                            }`}
                          >
                            {chapterActivity.name}
                          </p>
                          {isCurrent && (
                            <span className="shrink-0 text-[11px] font-semibold text-blue-600 dark:text-indigo-300">
                              {t('activities.current')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40">
                          <ActivityIcon size={13} />
                          <span>{activityMeta.label}</span>
                          {isLocked && (
                            <span className="font-semibold text-slate-400">
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )

                  if (isLocked) {
                    return (
                      <div
                        key={chapterActivity.id}
                        className="cursor-not-allowed select-none"
                      >
                        {rowContent}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={chapterActivity.id}
                      href={
                        getUriWithOrg(orgslug, '') +
                        `/course/${cleanCourseUuid}/activity/${cleanActivityUuid}`
                      }
                      prefetch={false}
                      onClick={() => setIsMobileContentOpen(false)}
                    >
                      {rowContent}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )

  return (
    <aside className="scrollbar-hide border-b border-slate-200 bg-white dark:border-white/8 dark:bg-[#13131a] lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:w-[350px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileContentOpen((isOpen) => !isOpen)}
          aria-expanded={isMobileContentOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-white/45">
              {t('courses.course_content')}
            </p>
            <h2 className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white/90">
              {currentActivity?.name || t('activities.current')}
            </h2>
          </div>
          <ChevronDown
            size={20}
            className={`shrink-0 text-slate-500 transition-transform dark:text-white/45 ${
              isMobileContentOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isMobileContentOpen && chapterList}
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 dark:border-white/8 dark:bg-[#13131a]/95">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white/90">
              {t('courses.course_content')}
            </h2>
          </div>
        </div>

        {chapterList}
      </div>
    </aside>
  )
}

export function MarkStatus(props: {
  activity: any
  activityid: string
  course: any
  orgslug: string
  trailData: any
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [isLoading, setIsLoading] = useState(false)
  const [showMarkedTooltip, setShowMarkedTooltip] = useState(false)
  const [showUnmarkedTooltip, setShowUnmarkedTooltip] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const markedTooltipCount = localStorage.getItem(
        'activity_marked_tooltip_count'
      )
      const unmarkedTooltipCount = localStorage.getItem(
        'activity_unmarked_tooltip_count'
      )

      if (!markedTooltipCount || parseInt(markedTooltipCount) < 3) {
        setShowMarkedTooltip(true)
      }
      if (!unmarkedTooltipCount || parseInt(unmarkedTooltipCount) < 3) {
        setShowUnmarkedTooltip(true)
      }
    }
  }, [])

  const handleMarkedTooltipClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activity_marked_tooltip_count', '3')
      setShowMarkedTooltip(false)
    }
  }

  const handleUnmarkedTooltipClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activity_unmarked_tooltip_count', '3')
      setShowUnmarkedTooltip(false)
    }
  }

  const infoIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )

  const areAllActivitiesCompleted = () => {
    const run = props.trailData?.runs?.find(
      (run: any) => run.course_uuid === props.course.course_uuid
    )
    if (!run) return false

    let totalActivities = 0
    let completedActivities = 0

    props.course.chapters.forEach((chapter: any) => {
      chapter.activities.forEach((activity: any) => {
        totalActivities++
        const isCompleted = run.steps.find(
          (step: any) =>
            step.activity_uuid === activity.activity_uuid &&
            step.complete === true
        )
        if (isCompleted) {
          completedActivities++
        }
      })
    })

    return completedActivities >= totalActivities - 1
  }

  async function markActivityAsCompleteFront() {
    try {
      const willCompleteAll = areAllActivitiesCompleted()
      setIsLoading(true)

      const result = await markActivityAsComplete(
        props.orgslug,
        props.course.course_uuid,
        props.activity.activity_uuid,
        session.data?.tokens?.access_token
      )

      if (!result.success) {
        toast.error(result.error || t('activities.failed_mark_complete'))
        return
      }

      await mutate(`${getAPIUrl()}trail/org/${org?.id}/trail`)

      if (willCompleteAll) {
        const cleanCourseUuid = props.course.course_uuid.replace('course_', '')
        router.push(
          getUriWithOrg(props.orgslug, '') +
            `/course/${cleanCourseUuid}/activity/end`
        )
      }
    } catch {
      // Error marking activity as complete
      toast.error(t('activities.failed_mark_complete'))
    } finally {
      setIsLoading(false)
    }
  }

  async function unmarkActivityAsCompleteFront() {
    try {
      setIsLoading(true)

      const result = await unmarkActivityAsComplete(
        props.orgslug,
        props.course.course_uuid,
        props.activity.activity_uuid,
        session.data?.tokens?.access_token
      )

      if (!result.success) {
        toast.error(result.error || t('activities.failed_unmark_complete'))
        return
      }

      await mutate(`${getAPIUrl()}trail/org/${org?.id}/trail`)
    } catch {
      toast.error(t('activities.failed_unmark_complete'))
    } finally {
      setIsLoading(false)
    }
  }

  const isActivityCompleted = () => {
    // Clean up course UUID by removing 'course_' prefix if it exists
    const cleanCourseUuid = props.course.course_uuid?.replace('course_', '')

    let run = props.trailData?.runs?.find((run: any) => {
      const cleanRunCourseUuid = run.course?.course_uuid?.replace('course_', '')
      return cleanRunCourseUuid === cleanCourseUuid
    })

    if (run) {
      // Find the step that matches the current activity
      return run.steps.find(
        (step: any) =>
          (step.activity_id === props.activity.id ||
            step.activity_uuid === props.activity.activity_uuid ||
            step.activity_uuid ===
              props.activity.activity_uuid?.replace('activity_', '')) &&
          step.complete === true
      )
    }
    return false
  }

  // Don't render until we have trail data
  if (!props.trailData) {
    return null
  }

  return (
    <>
      {isActivityCompleted() ? (
        <div className="flex items-center space-x-2">
          <div className="relative">
            <ConfirmationModal
              confirmationButtonText={t('activities.unmark_activity')}
              confirmationMessage={t('activities.unmark_activity_confirm')}
              dialogTitle={t('activities.unmark_activity_title')}
              dialogTrigger={
                <div className="nice-shadow flex w-full min-w-0 flex-col rounded-md bg-teal-600 px-4 p-2.5 text-white transition delay-150 duration-300 ease-in-out hover:cursor-pointer sm:w-auto">
                  <span className="text-[10px] font-bold mb-1 uppercase">
                    {t('common.status')}
                  </span>
                  <div className="flex min-w-0 items-center space-x-2">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 12l3 3 7-7" />
                    </svg>
                    <span className="min-w-0 truncate text-xs font-bold">
                      {t('common.complete')}
                    </span>
                  </div>
                </div>
              }
              functionToExecute={unmarkActivityAsCompleteFront}
              status="warning"
            />
            {showMarkedTooltip && (
              <MiniInfoTooltip
                icon={infoIcon}
                message={t('activities.unmark_tooltip')}
                onClose={handleMarkedTooltipClose}
                iconColor="text-teal-600"
                iconSize={24}
                width="w-64"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div
              className={`${isLoading ? 'opacity-90' : ''} nice-shadow flex w-full min-w-0 flex-col rounded-md bg-gray-800 px-4 p-2.5 text-white transition-all duration-200 hover:cursor-pointer sm:w-auto ${isLoading ? 'cursor-not-allowed' : 'hover:bg-gray-700'}`}
              onClick={!isLoading ? markActivityAsCompleteFront : undefined}
            >
              <span className="text-[10px] font-bold mb-1 uppercase">
                {t('common.status')}
              </span>
              <div className="flex min-w-0 items-center space-x-2">
                {isLoading ? (
                  <div className="animate-spin">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                  </div>
                ) : (
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                )}
                <span className="min-w-0 truncate text-xs font-bold sm:min-w-[90px]">
                  {isLoading
                    ? t('activities.marking')
                    : t('activities.mark_as_complete')}
                </span>
              </div>
            </div>
            {showUnmarkedTooltip && (
              <MiniInfoTooltip
                icon={infoIcon}
                message={t('activities.mark_tooltip')}
                onClose={handleUnmarkedTooltipClose}
                iconColor="text-gray-600"
                iconSize={24}
                width="w-64"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function MobileAssignmentActionDock({
  activity,
  activityid,
  assignment,
  course,
  orgslug,
  trailData,
}: {
  activity: any
  activityid: string
  assignment: any
  course: any
  orgslug: string
  trailData: any
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { allActivities, currentIndex } = useActivityPosition(
    course,
    activityid
  )
  const previousActivity =
    currentIndex > 0 ? allActivities[currentIndex - 1] : null
  const nextActivity =
    currentIndex < allActivities.length - 1
      ? allActivities[currentIndex + 1]
      : null
  const currentTrailRun = getCourseTrailRun(course.course_uuid, trailData)
  const nextActivityLocked = isActivityLockedByProgress(
    nextActivity,
    allActivities,
    currentTrailRun
  )

  const navigateToActivity = (targetActivity: any | 'end' | null) => {
    if (!targetActivity) return
    if (
      targetActivity !== 'end' &&
      isActivityLockedByProgress(targetActivity, allActivities, currentTrailRun)
    ) {
      toast.error('Complete the previous activity before continuing.')
      return
    }

    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    const targetActivityId =
      targetActivity === 'end' ? 'end' : targetActivity.cleanUuid

    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${targetActivityId}`
    )
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden dark:border-white/8 dark:bg-[#13131a]/95">
      <div className="mx-auto grid max-w-xl grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-end gap-2 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => navigateToActivity(previousActivity)}
          disabled={!previousActivity}
          aria-label={t('common.previous')}
          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/8 dark:bg-white/5 dark:text-white/70"
        >
          <ChevronLeft size={19} />
        </button>

        <AssignmentSubmissionProvider
          assignment_uuid={assignment?.assignment_uuid}
        >
          <AssignmentTools
            assignment={assignment}
            activity={activity}
            activityid={activityid}
            course={course}
            orgslug={orgslug}
          />
        </AssignmentSubmissionProvider>

        <button
          type="button"
          onClick={() =>
            !nextActivityLocked && navigateToActivity(nextActivity || 'end')
          }
          disabled={nextActivityLocked}
          aria-label={
            nextActivityLocked
              ? 'Locked'
              : nextActivity
                ? t('common.next')
                : t('courses.finish_course')
          }
          className={`flex h-10 w-10 items-center justify-center rounded-md text-white shadow-sm transition ${
            nextActivityLocked
              ? 'cursor-not-allowed bg-slate-300 text-slate-500'
              : nextActivity
                ? 'bg-blue-600'
                : 'bg-emerald-600'
          }`}
        >
          {nextActivityLocked ? (
            <Lock size={18} />
          ) : nextActivity ? (
            <ChevronRight size={19} />
          ) : (
            <Trophy size={18} />
          )}
        </button>
      </div>
    </div>
  )
}

function NextActivityButton({
  course,
  currentActivityId,
  orgslug,
  trailData,
}: {
  course: any
  currentActivityId: string
  orgslug: string
  trailData: any
}) {
  const { t } = useTranslation()
  const router = useRouter()

  const findNextActivity = () => {
    let allActivities: any[] = []
    let currentIndex = -1

    // Flatten all activities from all chapters
    course.chapters.forEach((chapter: any) => {
      chapter.activities.forEach((activity: any) => {
        const cleanActivityUuid = activity.activity_uuid?.replace(
          'activity_',
          ''
        )
        allActivities.push({
          ...activity,
          cleanUuid: cleanActivityUuid,
          chapterName: chapter.name,
        })

        // Check if this is the current activity
        if (activity.id === currentActivityId) {
          currentIndex = allActivities.length - 1
        }
      })
    })

    return {
      allActivities,
      nextActivity:
        currentIndex < allActivities.length - 1
          ? allActivities[currentIndex + 1]
          : null,
    }
  }

  const { nextActivity, allActivities } = findNextActivity()
  const currentTrailRun = getCourseTrailRun(course.course_uuid, trailData)
  const nextActivityLocked = isActivityLockedByProgress(
    nextActivity,
    allActivities,
    currentTrailRun
  )

  const navigateToActivity = () => {
    if (nextActivityLocked) {
      toast.error('Complete the previous activity before continuing.')
      return
    }

    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${nextActivity ? nextActivity.cleanUuid : 'end'}`
    )
  }

  if (!nextActivity) {
    return (
      <div
        onClick={navigateToActivity}
        className="flex w-full min-w-0 flex-col rounded-md bg-emerald-600 px-4 p-2.5 text-white shadow-lg transition delay-150 duration-300 ease-in-out hover:cursor-pointer hover:bg-emerald-700 sm:flex-1 md:max-w-xs"
      >
        <span className="text-[10px] font-bold text-emerald-100 mb-1 uppercase">
          {t('common.next')}
        </span>
        <div className="flex min-w-0 items-center space-x-2">
          <span className="min-w-0 truncate text-sm font-semibold">
            {t('courses.finish_course')}
          </span>
          <Trophy size={17} className="shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={nextActivityLocked ? undefined : navigateToActivity}
      aria-disabled={nextActivityLocked}
      className={`flex w-full min-w-0 flex-col rounded-md px-4 p-2.5 text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition delay-150 duration-300 ease-in-out sm:flex-1 md:max-w-xs ${
        nextActivityLocked
          ? 'cursor-not-allowed bg-slate-300 text-slate-500'
          : 'bg-blue-600 hover:cursor-pointer hover:bg-blue-700'
      }`}
    >
      <span
        className={`text-[10px] font-bold mb-1 uppercase ${
          nextActivityLocked ? 'text-slate-500' : 'text-white'
        }`}
      >
        {nextActivityLocked ? 'Locked' : t('common.next')}
      </span>
      <div className="flex min-w-0 items-center space-x-1">
        <span
          className={`min-w-0 truncate text-sm font-semibold ${
            nextActivityLocked ? 'text-slate-500' : 'text-white'
          }`}
        >
          {nextActivityLocked
            ? 'Complete previous activity'
            : nextActivity.name}
        </span>
        {nextActivityLocked ? (
          <Lock size={17} className="shrink-0 text-slate-500" />
        ) : (
          <ChevronRight size={17} className="shrink-0 text-white" />
        )}
      </div>
    </div>
  )
}

function PreviousActivityButton({
  course,
  currentActivityId,
  orgslug,
}: {
  course: any
  currentActivityId: string
  orgslug: string
}) {
  const { t } = useTranslation()
  const router = useRouter()

  const findPreviousActivity = () => {
    let allActivities: any[] = []
    let currentIndex = -1

    // Flatten all activities from all chapters
    course.chapters.forEach((chapter: any) => {
      chapter.activities.forEach((activity: any) => {
        const cleanActivityUuid = activity.activity_uuid?.replace(
          'activity_',
          ''
        )
        allActivities.push({
          ...activity,
          cleanUuid: cleanActivityUuid,
          chapterName: chapter.name,
        })

        // Check if this is the current activity
        if (activity.id === currentActivityId) {
          currentIndex = allActivities.length - 1
        }
      })
    })

    // Get previous activity
    return currentIndex > 0 ? allActivities[currentIndex - 1] : null
  }

  const previousActivity = findPreviousActivity()

  if (!previousActivity) return null

  const navigateToActivity = () => {
    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${previousActivity.cleanUuid}`
    )
  }

  return (
    <div
      onClick={navigateToActivity}
      className="nice-shadow flex w-full min-w-0 flex-col rounded-md bg-white px-4 p-2.5 text-gray-600 transition delay-150 duration-300 ease-in-out hover:cursor-pointer hover:bg-gray-50 dark:border dark:border-white/8 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 sm:flex-1 md:max-w-xs"
    >
      <span className="text-[10px] font-bold text-gray-500 mb-1 uppercase dark:text-white/40">
        {t('common.previous')}
      </span>
      <div className="flex min-w-0 items-center space-x-1">
        <ChevronLeft size={17} className="shrink-0" />
        <span className="min-w-0 truncate text-sm font-semibold">
          {previousActivity.name}
        </span>
      </div>
    </div>
  )
}

function AssignmentTools(props: {
  activity: any
  activityid: string
  course: any
  orgslug: string
  assignment: any
}) {
  const { t } = useTranslation()
  const submission = useAssignmentSubmission() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // Fetch task submissions to check for completeness
  const { data: taskSubmissionsRes } = useSWR(
    props.assignment?.assignment_uuid && access_token
      ? `${getAPIUrl()}assignments/${props.assignment.assignment_uuid}/tasks/submissions/me`
      : null,
    (url) => swrFetcher(url, access_token)
  )

  const taskSubmissions = React.useMemo(
    () => (Array.isArray(taskSubmissionsRes) ? taskSubmissionsRes : []),
    [taskSubmissionsRes]
  )

  // Fetch assignment tasks accurately
  const { data: assignmentTasksRes } = useSWR(
    props.assignment?.assignment_uuid && access_token
      ? `${getAPIUrl()}assignments/${props.assignment.assignment_uuid}/tasks`
      : null,
    (url) => swrFetcher(url, access_token)
  )

  const assignmentTasks = React.useMemo(
    () => (Array.isArray(assignmentTasksRes) ? assignmentTasksRes : []),
    [assignmentTasksRes]
  )
  const totalTasks = assignmentTasks.length || 0
  const assignmentTaskIds = React.useMemo(
    () =>
      new Set(
        assignmentTasks
          .map((assignmentTask: any) => assignmentTask.id)
          .filter(Boolean)
      ),
    [assignmentTasks]
  )

  const savedTaskSubmissionIds = React.useMemo(
    () =>
      new Set(
        taskSubmissions
          .map((taskSubmission: any) => taskSubmission.assignment_task_id)
          .filter((taskId: any) => assignmentTaskIds.has(taskId))
      ),
    [taskSubmissions, assignmentTaskIds]
  )
  const isComplete =
    totalTasks > 0 && savedTaskSubmissionIds.size === assignmentTaskIds.size

  const submitForGradingUI = async () => {
    if (props.assignment) {
      if (!isComplete) {
        toast.error(t('assignments.submit_incomplete_warning'))
        return
      }

      const res = await submitAssignmentForGrading(
        props.assignment?.assignment_uuid,
        session.data?.tokens?.access_token
      )
      if (res.success) {
        toast.success(t('assignments.assignment_submitted_success'))
        mutate(
          `${getAPIUrl()}assignments/${props.assignment?.assignment_uuid}/submissions/me`
        )
      } else {
        toast.error(
          res.data?.detail || t('assignments.failed_submit_assignment')
        )
      }
    }
  }

  // Helper function to convert numeric grade to alphabet grade
  const convertNumericToAlphabet = React.useCallback(
    (grade: any, maxGrade: any) => {
      const percentage = (grade / maxGrade) * 100
      if (percentage >= 90) return 'A'
      if (percentage >= 80) return 'B'
      if (percentage >= 70) return 'C'
      if (percentage >= 60) return 'D'
      return 'F'
    },
    []
  )

  // Fetch final grade using SWR
  const shouldFetchGrade =
    submission &&
    submission.length > 0 &&
    submission[0].submission_status === 'GRADED'
  const { data: finalGradeRes } = useSWR(
    shouldFetchGrade
      ? [
          'final-grade',
          session.data?.user?.id,
          props.assignment?.assignment_uuid,
          session.data?.tokens?.access_token,
        ]
      : null,
    ([_, userId, assignmentId, token]) =>
      getFinalGrade(userId, assignmentId, token)
  )

  // Derive final grade from SWR data
  const finalGrade = React.useMemo(() => {
    if (!finalGradeRes?.success) return null
    const { grade, max_grade, grading_type } = finalGradeRes.data

    switch (grading_type) {
      case 'ALPHABET':
        return convertNumericToAlphabet(grade, max_grade)
      case 'NUMERIC':
        return `${grade}/${max_grade}`
      case 'PERCENTAGE': {
        const percentage = (grade / max_grade) * 100
        return `${percentage.toFixed(2)}%`
      }
      default:
        return 'Unknown grading type'
    }
  }, [finalGradeRes, convertNumericToAlphabet])

  const needsRevision = submission?.[0]?.submission_status === 'NEEDS_REVISION'

  if (!submission || submission.length === 0 || needsRevision) {
    return (
      <div className="contents">
        {needsRevision && (
          <div className="col-span-full flex min-w-0 flex-col gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-sky-700 sm:col-auto sm:w-64 sm:px-3">
            <div className="flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-tight">
                {t('assignments.needs_revision')}
              </p>
            </div>
            {submission?.[0]?.submission_feedback && (
              <p className="text-xs font-medium leading-snug">
                {submission[0].submission_feedback}
              </p>
            )}
          </div>
        )}
        {!isComplete && totalTasks > 0 && (
          <div className="col-span-full flex min-h-8 min-w-0 items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-600 sm:col-auto sm:min-h-10 sm:px-3">
            <Info size={14} className="shrink-0" />
            <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-tight">
              {t('assignments.unsaved_tasks_warning')}
            </p>
          </div>
        )}
        {!isComplete ? (
          <div
            onClick={submitForGradingUI}
            className="nice-shadow flex min-h-10 w-full min-w-0 items-center justify-center rounded-md bg-amber-600 px-2.5 text-white transition-all duration-300 ease-in-out hover:cursor-pointer hover:bg-amber-700 sm:w-auto sm:min-w-44 sm:px-4"
          >
            <div className="flex min-w-0 items-center gap-2">
              <BookOpenCheck size={17} className="shrink-0" />
              <span className="min-w-0 truncate text-center text-[11px] font-bold leading-tight sm:text-xs">
                {t('assignments.submit_for_grading')}
              </span>
            </div>
          </div>
        ) : (
          <ConfirmationModal
            confirmationButtonText={t('assignments.submit_assignment')}
            confirmationMessage={t('assignments.submit_assignment_confirm')}
            dialogTitle={t('assignments.submit_assignment_title')}
            dialogTrigger={
              <div className="nice-shadow flex min-h-10 w-full min-w-0 items-center justify-center rounded-md bg-cyan-800 px-2.5 text-white transition-all duration-300 ease-in-out hover:cursor-pointer hover:bg-cyan-900 sm:w-auto sm:min-w-44 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <BookOpenCheck size={17} className="shrink-0" />
                  <span className="min-w-0 truncate text-center text-[11px] font-bold leading-tight sm:text-xs">
                    {t('assignments.submit_for_grading')}
                  </span>
                </div>
              </div>
            }
            functionToExecute={submitForGradingUI}
            status="info"
          />
        )}
      </div>
    )
  }

  if (submission[0].submission_status === 'SUBMITTED') {
    return (
      <div className="nice-shadow flex min-h-10 w-full min-w-0 items-center justify-center rounded-md bg-amber-800 px-2.5 text-white transition delay-150 duration-300 ease-in-out sm:w-auto sm:min-w-44 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <UserRoundPen size={17} className="shrink-0" />
          <span className="min-w-0 truncate text-center text-[11px] font-bold leading-tight sm:text-xs">
            {t('assignments.grading_in_progress')}
          </span>
        </div>
      </div>
    )
  }

  if (submission[0].submission_status === 'GRADED') {
    const gradeFeedback = submission[0].submission_feedback
    return (
      <div className="nice-shadow flex min-h-10 w-full min-w-0 flex-col justify-center gap-1.5 rounded-md bg-teal-600 px-2.5 py-2 text-white transition delay-150 duration-300 ease-in-out sm:w-auto sm:min-w-32 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle size={17} className="shrink-0" />
          <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold leading-tight sm:text-xs">
            <span className="min-w-0 truncate">{t('assignments.graded')} </span>
            <span className="shrink-0 rounded-md bg-white px-1 py-0.5 text-teal-800">
              {finalGrade}
            </span>
          </span>
        </div>
        {gradeFeedback && (
          <p className="text-xs font-medium leading-snug text-teal-50">
            {gradeFeedback}
          </p>
        )}
      </div>
    )
  }

  // Default return in case none of the conditions are met
  return null
}

function ActivityStatusBadge({
  activity,
  course,
  trailData,
}: {
  activity: any
  course: any
  trailData: any
}) {
  const { t } = useTranslation()
  const cleanCourseUuid = course.course_uuid?.replace('course_', '')
  const run = trailData?.runs?.find(
    (run: any) =>
      run.course?.course_uuid?.replace('course_', '') === cleanCourseUuid
  )
  const isDone = run?.steps.find(
    (step: any) =>
      (step.activity_id === activity.id ||
        step.activity_uuid === activity.activity_uuid) &&
      step.complete === true
  )

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
        isDone
          ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
          : 'bg-zinc-800/50 text-zinc-500 border-white/5'
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isDone
            ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]'
            : 'bg-zinc-600'
        }`}
      />
      <span>
        {isDone ? t('common.completed') : t('activities.not_started')}
      </span>
    </div>
  )
}

export default ActivityClient
