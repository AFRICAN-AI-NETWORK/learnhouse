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
    <div className="flex space-x-2 items-center">
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
  const { contributorStatus } = useContributorStatus(courseuuid)
  const router = useRouter()

  // Add SWR for trail data
  const { data: trailData } = useSWR(
    `${getAPIUrl()}trail/org/${org?.id}/trail`,
    (url) => swrFetcher(url, access_token)
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
        if (mark) {
          await markActivityAsComplete(
            orgslug,
            courseuuid,
            aUuid,
            session.data?.tokens?.access_token
          )
        } else {
          await unmarkActivityAsComplete(
            orgslug,
            courseuuid,
            aUuid,
            session.data?.tokens?.access_token
          )
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
            <VideoActivity course={course} activity={activity} />
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

  const totalActivities = useMemo(
    () =>
      course.chapters?.reduce(
        (acc: number, chapter: any) => acc + (chapter.activities?.length || 0),
        0
      ) || 0,
    [course.chapters]
  )

  const completedActivities = useMemo(() => {
    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    const run = trailData?.runs?.find((run: any) => {
      const runCourseUuid =
        run.course?.course_uuid || run.course_uuid || run.course?.uuid
      return runCourseUuid?.replace('course_', '') === cleanCourseUuid
    })

    return run?.steps?.filter((step: any) => step.complete === true).length || 0
  }, [course.course_uuid, trailData])

  const progressPercentage =
    totalActivities > 0
      ? Math.min(100, Math.round((completedActivities / totalActivities) * 100))
      : 0

  useEffect(() => {
    if (activity.activity_type == 'TYPE_ASSIGNMENT') {
      getAssignmentUI()
    }
  }, [activity.activity_type, getAssignmentUI])

  return (
    <>
      {/* Full viewport for Live Sessions in focus mode */}
      <AnimatePresence mode="wait">
        {activity?.activity_type === 'TYPE_LIVE_SESSION' && isFocusMode && (
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
      {!(activity?.activity_type === 'TYPE_LIVE_SESSION' && isFocusMode) && (
        <>
          <CourseProvider courseuuid={course?.course_uuid}>
            <Suspense fallback={<LoadingFallback />}>
              <AIChatBotProvider>
                {isFocusMode ? (
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
                              <div className="container mx-auto px-4 py-2">
                                <div className="flex items-center justify-between h-14">
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
                                    className="flex items-center space-x-4"
                                  >
                                    <div className="flex">
                                      <Link
                                        href={
                                          getUriWithOrg(orgslug, '') +
                                          `/course/${courseuuid}`
                                        }
                                      >
                                        <img
                                          className="w-[60px] h-[34px] rounded-md drop-shadow-md"
                                          src={`${getCourseThumbnailMediaDirectory(
                                            org?.org_uuid,
                                            course.course_uuid,
                                            course.thumbnail_image
                                          )}`}
                                          alt=""
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
                                    className="flex items-center space-x-3"
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
                                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all h-[36px] flex items-center shadow-lg ${
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
                                        <span className="flex items-center gap-2">
                                          <CheckCircle size={14} />
                                          {t('activities.completed')}
                                        </span>
                                      ) : (
                                        t('activities.mark_as_complete')
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
                                    navigateToActivity(nextActivity || 'end')
                                  }
                                  className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/10 text-white transition-all shadow-2xl hover:bg-zinc-800 hover:scale-110 ${
                                    !nextActivity
                                      ? 'border-emerald-500/50 text-emerald-400'
                                      : ''
                                  }`}
                                  title={
                                    nextActivity
                                      ? `${t('common.next')}: ${nextActivity.name}`
                                      : t('courses.finish_course')
                                  }
                                >
                                  {nextActivity ? (
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
                                        <div className="relative z-10 w-full overflow-visible">
                                          {activityContent}
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
                              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-xl border-t border-white/5 py-3 px-6 flex items-center justify-between"
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
                                  navigateToActivity(nextActivity || 'end')
                                }
                                className={`flex flex-col items-center gap-1 transition-all ${
                                  nextActivity
                                    ? 'text-white'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {nextActivity ? (
                                  <ChevronRight size={20} />
                                ) : (
                                  <Trophy size={20} />
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {nextActivity
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
                  <div className="min-h-screen bg-[#f7f9fc]">
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
                            <div className="px-4 py-5 sm:px-6 xl:px-8">
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
                                  ) : (
                                    <div className="activity-info-section rounded-lg border border-slate-200 bg-white shadow-sm">
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
                                      >
                                        {activityContent}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {activity &&
                                activity.published == true &&
                                activity.content.paid_access != false && (
                                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <PreviousActivityButton
                                      course={course}
                                      currentActivityId={activity.id}
                                      orgslug={orgslug}
                                    />
                                    <NextActivityButton
                                      course={course}
                                      currentActivityId={activity.id}
                                      orgslug={orgslug}
                                    />
                                  </div>
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
}) {
  const { t } = useTranslation()
  const cleanCourseUuid = course.course_uuid?.replace('course_', '')

  return (
    <div className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 xl:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4 gap-5">
            <Link
              href={getUriWithOrg(orgslug, '') + `/course/${cleanCourseUuid}`}
              className="hidden shrink-0 bg-white p-1 shadow-xs sm:block"
            >
              <img
                className="w-32"
                src={`${getOrgLogoMediaDirectory(org.org_uuid, org?.logo_image)}`}
                alt=""
              />
            </Link>
            <div className="min-w-0 flex flex-row gap-10">
              <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase text-slate-500">
                <Link
                  href={getUriWithOrg(orgslug, '') + `/course/${courseuuid}`}
                  className="truncate hover:text-slate-900"
                >
                  {course.name}
                </Link>
                <ChevronRight size={14} className="shrink-0 text-slate-300" />
                <span className="truncate text-slate-800">
                  {activity?.name}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-slate-500">
                  {t('courses.course_progress')}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-200 sm:w-72">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-600">
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
                <div className="flex flex-wrap items-center gap-2">
                  {activity.activity_type !== 'TYPE_SMART_ARTICLE' && (
                    <AIActivityAsk activity={activity} />
                  )}

                  {contributorStatus === 'ACTIVE' &&
                    activity.activity_type == 'TYPE_DYNAMIC' && (
                      <Link
                        href={
                          getUriWithOrg(orgslug, '') +
                          `/course/${courseuuid}/activity/${activityid}/edit`
                        }
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Edit2 size={16} />
                        {t('courses.contribute')}
                      </Link>
                    )}

                  {activity.activity_type === 'TYPE_ASSIGNMENT' ? (
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
                  ) : (
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
                      disabled={loadingMarkComplete}
                      className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-xs font-bold uppercase transition ${
                        isActivityComplete(
                          activity.activity_uuid,
                          course.course_uuid,
                          trailData
                        )
                          ? 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
                          : 'border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {loadingMarkComplete ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isActivityComplete(
                          activity.activity_uuid,
                          course.course_uuid,
                          trailData
                        ) ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Circle size={16} />
                      )}
                      {isActivityComplete(
                        activity.activity_uuid,
                        course.course_uuid,
                        trailData
                      )
                        ? t('common.completed')
                        : t('activities.mark_as_complete')}
                    </button>
                  )}
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
  const run = trailData?.runs?.find((run: any) => {
    const runCourseUuid =
      run.course?.course_uuid || run.course_uuid || run.course?.uuid
    return runCourseUuid?.replace('course_', '') === cleanCourseUuid
  })

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

  return (
    <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-[73px] lg:h-[calc(100vh-73px)] lg:w-[350px] lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {t('courses.course_content')}
          </h2>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto py-3 lg:max-h-none lg:overflow-visible">
        {course.chapters?.map((chapter: any, index: number) => {
          const chapterKey = chapter.id ?? index
          const isOpen = openChapterKey === chapterKey

          return (
            <section
              key={chapterKey}
              className="border-b border-slate-100 pb-3"
            >
              <button
                type="button"
                onClick={() =>
                  setOpenChapterKey((currentKey: any) =>
                    currentKey === chapterKey ? null : chapterKey
                  )
                }
                aria-expanded={isOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-bold uppercase leading-5 text-slate-900">
                    {chapter.name}
                  </h3>
                </div>
                <ChevronDown
                  size={18}
                  className={`mt-1 shrink-0 text-slate-500 transition-transform ${
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
                    const activityMeta = getActivityMeta(
                      chapterActivity.activity_type
                    )
                    const ActivityIcon = activityMeta.icon

                    return (
                      <Link
                        key={chapterActivity.id}
                        href={
                          getUriWithOrg(orgslug, '') +
                          `/course/${cleanCourseUuid}/activity/${cleanActivityUuid}`
                        }
                        prefetch={false}
                        className={`group flex gap-3 border-l-2 px-4 py-3 transition ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                          {complete ? (
                            <CheckCircle
                              size={17}
                              className="text-teal-600"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <Circle
                              size={12}
                              className={
                                isCurrent ? 'text-blue-600' : 'text-slate-300'
                              }
                              fill={isCurrent ? 'currentColor' : 'none'}
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={`line-clamp-2 text-sm font-semibold leading-5 ${
                                isCurrent ? 'text-slate-950' : 'text-slate-700'
                              }`}
                            >
                              {chapterActivity.name}
                            </p>
                            {isCurrent && (
                              <span className="shrink-0 text-[11px] font-semibold text-blue-600">
                                {t('activities.current')}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <ActivityIcon size={13} />
                            <span>{activityMeta.label}</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
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

      await markActivityAsComplete(
        props.orgslug,
        props.course.course_uuid,
        props.activity.activity_uuid,
        session.data?.tokens?.access_token
      )

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

      await unmarkActivityAsComplete(
        props.orgslug,
        props.course.course_uuid,
        props.activity.activity_uuid,
        session.data?.tokens?.access_token
      )

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
          step.activity_id === props.activity.id && step.complete === true
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
                <div className="bg-teal-600 rounded-md px-4 nice-shadow flex flex-col p-2.5 text-white hover:cursor-pointer transition delay-150 duration-300 ease-in-out">
                  <span className="text-[10px] font-bold mb-1 uppercase">
                    {t('common.status')}
                  </span>
                  <div className="flex items-center space-x-2">
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
                    <span className="text-xs font-bold">
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
              className={`${isLoading ? 'opacity-90' : ''} bg-gray-800 rounded-md px-4 nice-shadow flex flex-col p-2.5 text-white hover:cursor-pointer transition-all duration-200 ${isLoading ? 'cursor-not-allowed' : 'hover:bg-gray-700'}`}
              onClick={!isLoading ? markActivityAsCompleteFront : undefined}
            >
              <span className="text-[10px] font-bold mb-1 uppercase">
                {t('common.status')}
              </span>
              <div className="flex items-center space-x-2">
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
                <span className="text-xs font-bold min-w-[90px]">
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

function NextActivityButton({
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

    // Get next activity
    return currentIndex < allActivities.length - 1
      ? allActivities[currentIndex + 1]
      : null
  }

  const nextActivity = findNextActivity()

  const navigateToActivity = () => {
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
        className="bg-emerald-600 rounded-md px-4 shadow-lg flex flex-col p-2.5 text-white hover:cursor-pointer transition delay-150 duration-300 ease-in-out hover:bg-emerald-700"
      >
        <span className="text-[10px] font-bold text-emerald-100 mb-1 uppercase">
          {t('common.next')}
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {t('courses.finish_course')}
          </span>
          <Trophy size={17} />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={navigateToActivity}
      className="bg-blue-600 rounded-md px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] flex flex-col p-2.5 text-gray-600 hover:cursor-pointer transition delay-150 duration-300 ease-in-out hover:bg-gray-200"
    >
      <span className="text-[10px] font-bold text-white mb-1 uppercase">
        {t('common.next')}
      </span>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-semibold truncate max-w-[200px] text-white">
          {nextActivity.name}
        </span>
        <ChevronRight size={17} className="text-white" />
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
      className="bg-white rounded-md px-4 nice-shadow flex flex-col p-2.5 text-gray-600 hover:cursor-pointer transition delay-150 duration-300 ease-in-out"
    >
      <span className="text-[10px] font-bold text-gray-500 mb-1 uppercase">
        {t('common.previous')}
      </span>
      <div className="flex items-center space-x-1">
        <ChevronLeft size={17} />
        <span className="text-sm font-semibold truncate max-w-[200px]">
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

  const isComplete = taskSubmissions.length >= totalTasks && totalTasks > 0

  const submitForGradingUI = async () => {
    if (props.assignment) {
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
        toast.error(t('assignments.failed_submit_assignment'))
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

  if (!submission || submission.length === 0) {
    return (
      <div className="flex flex-col items-end gap-2">
        {!isComplete && totalTasks > 0 && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 animate-pulse">
            <Info size={14} />
            <p className="text-[10px] font-bold uppercase tracking-tight">
              {t('assignments.unsaved_tasks_warning')}
            </p>
          </div>
        )}
        <ConfirmationModal
          confirmationButtonText={t('assignments.submit_assignment')}
          confirmationMessage={
            !isComplete
              ? t('assignments.submit_incomplete_warning')
              : t('assignments.submit_assignment_confirm')
          }
          dialogTitle={t('assignments.submit_assignment_title')}
          dialogTrigger={
            <div
              className={`${!isComplete ? 'bg-amber-600 hover:bg-amber-700' : 'bg-cyan-800 hover:bg-cyan-900'} rounded-md px-4 nice-shadow flex flex-col p-2.5 text-white hover:cursor-pointer transition-all duration-300 ease-in-out`}
            >
              <span className="text-[10px] font-bold mb-1 uppercase opacity-80">
                {t('common.status')}
              </span>
              <div className="flex items-center space-x-2">
                <BookOpenCheck size={17} />
                <span className="text-xs font-bold">
                  {t('assignments.submit_for_grading')}
                </span>
              </div>
            </div>
          }
          functionToExecute={submitForGradingUI}
          status={!isComplete ? 'warning' : 'info'}
        />
      </div>
    )
  }

  if (submission[0].submission_status === 'SUBMITTED') {
    return (
      <div className="bg-amber-800 rounded-md px-4 nice-shadow flex flex-col p-2.5 text-white transition delay-150 duration-300 ease-in-out">
        <span className="text-[10px] font-bold mb-1 uppercase">
          {t('common.status')}
        </span>
        <div className="flex items-center space-x-2">
          <UserRoundPen size={17} />
          <span className="text-xs font-bold">
            {t('assignments.grading_in_progress')}
          </span>
        </div>
      </div>
    )
  }

  if (submission[0].submission_status === 'GRADED') {
    return (
      <div className="bg-teal-600 rounded-md px-4 nice-shadow flex flex-col p-2.5 text-white transition delay-150 duration-300 ease-in-out">
        <span className="text-[10px] font-bold mb-1 uppercase">
          {t('common.status')}
        </span>
        <div className="flex items-center space-x-2">
          <CheckCircle size={17} />
          <span className="text-xs flex space-x-2 font-bold items-center">
            <span>{t('assignments.graded')} </span>
            <span className="bg-white text-teal-800 px-1 py-0.5 rounded-md">
              {finalGrade}
            </span>
          </span>
        </div>
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
