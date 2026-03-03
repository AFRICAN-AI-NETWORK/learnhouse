'use client'
import Link from 'next/link'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import {
  BookOpenCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  UserRoundPen,
  Edit2,
  Maximize2,
  Minimize2,
  Info,
  Loader2,
} from 'lucide-react'
import {
  markActivityAsComplete,
  unmarkActivityAsComplete,
} from '@services/courses/activity'
import { useRouter } from 'next/navigation'
import AuthenticatedClientElement from '@components/Security/AuthenticatedClientElement'
import {
  getCourseThumbnailMediaDirectory,
  getUserAvatarMediaDirectory,
} from '@services/media/media'
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
import ToolTip from '@components/Objects/StyledElements/Tooltip/Tooltip'
import ActivityChapterDropdown from '@components/Pages/Activity/ActivityChapterDropdown'
import FixedActivitySecondaryBar from '@components/Pages/Activity/FixedActivitySecondaryBar'
import CourseEndView from '@components/Pages/Activity/CourseEndView'
import { motion, AnimatePresence } from 'framer-motion'
import ActivityBreadcrumbs from '@components/Pages/Activity/ActivityBreadcrumbs'
import MiniInfoTooltip from '@components/Objects/MiniInfoTooltip'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import ActivityIndicators from '@components/Pages/Courses/ActivityIndicators'
import UserAvatar from '@components/Objects/UserAvatar'
import { useTranslation } from 'react-i18next'

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
  const [isFocusMode, setIsFocusMode] = useState(true)
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
              isFocusMode={isFocusMode}
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
                  <AssignmentStudentActivity isFocusMode={isFocusMode} />
                </AssignmentSubmissionProvider>
              </AssignmentsTaskProvider>
            </AssignmentProvider>
          </Suspense>
        ) : (
          <LoadingFallback />
        )
      default:
        return null
    }
  }, [
    activity,
    course,
    assignment,
    isFocusMode,
    handleMarkAsComplete,
    isActivityComplete,
    trailData,
  ])

  // Navigate to an activity
  const navigateToActivity = (activity: any) => {
    if (!activity) return

    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${activity.cleanUuid}`
    )
  }

  // Initialize focus mode - always default to true for a consistent start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always start in focus mode by default as requested
      setIsFocusMode(true)
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

  useEffect(() => {
    if (activity.activity_type == 'TYPE_ASSIGNMENT') {
      getAssignmentUI()
    }
  }, [activity.activity_type, getAssignmentUI])

  return (
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
                                  !hasMounted ? false : { opacity: 0, x: -20 }
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
                                                acc + chapter.activities.length,
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
                                              acc + chapter.activities.length,
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
                                        run.course_uuid === course.course_uuid
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
                                  !hasMounted ? false : { opacity: 0, y: -20 }
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
                                  !hasMounted ? false : { opacity: 0, x: 20 }
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

                                {/* Exit button hidden per user request on Desktop and Tablet */}
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setIsFocusMode(false)}
                                  className="bg-white/5 border border-white/10 p-2 rounded-full cursor-pointer hover:bg-white/10 transition-colors md:hidden"
                                  title={t('activities.exit_focus_mode')}
                                >
                                  <Minimize2 size={16} className="text-white" />
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
                              animate={{ opacity: prevActivity ? 1 : 0, x: 0 }}
                              whileHover={{ x: -2 }}
                              onClick={() => navigateToActivity(prevActivity)}
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
                              animate={{ opacity: nextActivity ? 1 : 0, x: 0 }}
                              whileHover={{ x: 2 }}
                              onClick={() => navigateToActivity(nextActivity)}
                              disabled={!nextActivity}
                              className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-zinc-900/50 backdrop-blur-md border border-white/10 text-white transition-all shadow-2xl ${
                                nextActivity
                                  ? 'hover:bg-zinc-800 hover:scale-110'
                                  : 'hidden'
                              }`}
                              title={
                                nextActivity
                                  ? `${t('common.next')}: ${nextActivity.name}`
                                  : ''
                              }
                            >
                              <ChevronRight size={24} />
                            </motion.button>
                          </div>
                        )}

                        <div
                          className={`${activity?.activity_type === 'TYPE_VIDEO' ? 'max-w-5xl' : isSmartArticle ? 'max-w-full' : 'max-w-(--breakpoint-xl)'} mx-auto ${isSmartArticle ? 'px-0' : 'px-4 mb-20'}`}
                        >
                          {activity && activity.published == true && (
                            <>
                              {activity.content.paid_access == false ? (
                                <PaidCourseActivityDisclaimer course={course} />
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
                            onClick={() => navigateToActivity(nextActivity)}
                            disabled={!nextActivity}
                            className={`flex flex-col items-center gap-1 transition-all ${
                              nextActivity
                                ? 'text-white'
                                : 'text-zinc-600 opacity-50'
                            }`}
                          >
                            <ChevronRight size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                              {t('common.next')}
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
              <GeneralWrapperStyled
                maxWidth={
                  activity?.activity_type === 'TYPE_VIDEO'
                    ? 'max-w-5xl'
                    : 'max-w-(--breakpoint-xl)'
                }
              >
                {/* Original non-focus mode UI */}
                {activityid === 'end' ? (
                  <CourseEndView
                    courseName={course.name}
                    orgslug={orgslug}
                    courseUuid={course.course_uuid}
                    thumbnailImage={course.thumbnail_image}
                    course={course}
                    trailData={trailData}
                  />
                ) : (
                  <div className="space-y-4 pt-0">
                    <div className="pt-2">
                      <ActivityBreadcrumbs
                        course={course}
                        activity={activity}
                        orgslug={orgslug}
                      />
                      <div className="space-y-4 pb-4 activity-info-section">
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-4 md:space-x-6">
                            <div className="hidden sm:flex">
                              <Link
                                href={
                                  getUriWithOrg(orgslug, '') +
                                  `/course/${courseuuid}`
                                }
                              >
                                <img
                                  className="w-[70px] md:w-[90px] h-[40px] md:h-[52px] rounded-lg shadow-md border border-white/20 object-cover"
                                  src={`${getCourseThumbnailMediaDirectory(
                                    org?.org_uuid,
                                    course.course_uuid,
                                    course.thumbnail_image
                                  )}`}
                                  alt=""
                                />
                              </Link>
                            </div>
                            <div className="flex flex-col justify-center">
                              <p className="font-black text-zinc-400 text-[10px] uppercase tracking-[0.2em] mb-0.5">
                                {t('search.course')}{' '}
                              </p>
                              <h1 className="font-black text-zinc-950 text-xl md:text-2xl tracking-tight line-clamp-1"></h1>
                            </div>
                          </div>
                        </div>

                        <ActivityIndicators
                          course_uuid={courseuuid}
                          current_activity={activityid}
                          orgslug={orgslug}
                          course={course}
                          enableNavigation={true}
                          trailData={trailData}
                        />

                        <div className="flex justify-between items-center w-full">
                          <div className="flex flex-col items-start gap-4 grow">
                            <div className="flex flex-col">
                              <p className="font-bold text-zinc-500 text-[11px] uppercase tracking-wider mb-1">
                                {getChapterNameByActivityId(
                                  course,
                                  activity.id
                                )}
                              </p>
                              <h1 className="font-black text-zinc-950 text-2xl md:text-3xl tracking-tight leading-tight">
                                {activity.name}
                              </h1>
                            </div>

                            {/* Authors and Dates Section - Hidden on mobile */}
                            <div className="hidden sm:flex flex-wrap items-center gap-4 py-2 px-4 bg-zinc-50 border border-zinc-200/50 rounded-2xl">
                              <div className="flex items-center gap-3">
                                {/* Avatars */}
                                {course.authors &&
                                  course.authors.length > 0 && (
                                    <div className="flex -space-x-2.5">
                                      {course.authors
                                        .filter(
                                          (a: any) =>
                                            a.authorship_status === 'ACTIVE'
                                        )
                                        .slice(0, 3)
                                        .map((author: any) => (
                                          <div
                                            key={author.user.user_uuid}
                                            className="relative z-10 transition-transform hover:scale-110 hover:z-20"
                                          >
                                            <UserAvatar
                                              border="border-2"
                                              rounded="rounded-full"
                                              avatar_url={
                                                author.user.avatar_image
                                                  ? getUserAvatarMediaDirectory(
                                                      author.user.user_uuid,
                                                      author.user.avatar_image
                                                    )
                                                  : ''
                                              }
                                              predefined_avatar={
                                                author.user.avatar_image
                                                  ? undefined
                                                  : 'empty'
                                              }
                                              width={24}
                                              showProfilePopup={true}
                                              userId={author.user.id}
                                            />
                                          </div>
                                        ))}
                                      {course.authors.filter(
                                        (a: any) =>
                                          a.authorship_status === 'ACTIVE'
                                      ).length > 3 && (
                                        <div className="flex items-center justify-center bg-zinc-100 text-zinc-600 font-bold rounded-full border-2 border-white shadow-sm w-7 h-7 text-[10px] z-0">
                                          +
                                          {course.authors.filter(
                                            (a: any) =>
                                              a.authorship_status === 'ACTIVE'
                                          ).length - 3}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                {/* Author names */}
                                {course.authors &&
                                  course.authors.length > 0 && (
                                    <div className="text-[11px] text-zinc-900 font-bold flex items-center gap-1">
                                      {course.authors.filter(
                                        (a: any) =>
                                          a.authorship_status === 'ACTIVE'
                                      ).length > 1 && (
                                        <span className="text-zinc-500 font-medium">
                                          {t('courses.co_created_by')}{' '}
                                        </span>
                                      )}
                                      {course.authors
                                        .filter(
                                          (a: any) =>
                                            a.authorship_status === 'ACTIVE'
                                        )
                                        .slice(0, 2)
                                        .map(
                                          (
                                            author: any,
                                            idx: number,
                                            arr: any[]
                                          ) => (
                                            <span key={author.user.user_uuid}>
                                              {author.user.first_name &&
                                              author.user.last_name
                                                ? `${author.user.first_name} ${author.user.last_name}`
                                                : `@${author.user.username}`}
                                              {idx === 0 && arr.length > 1
                                                ? ' & '
                                                : ''}
                                            </span>
                                          )
                                        )}
                                      {course.authors.filter(
                                        (a: any) =>
                                          a.authorship_status === 'ACTIVE'
                                      ).length > 2 && (
                                        <ToolTip
                                          content={
                                            <div className="p-2">
                                              {course.authors
                                                .filter(
                                                  (a: any) =>
                                                    a.authorship_status ===
                                                    'ACTIVE'
                                                )
                                                .slice(2)
                                                .map((author: any) => (
                                                  <div
                                                    key={author.user.user_uuid}
                                                    className="text-white text-sm py-1"
                                                  >
                                                    {author.user.first_name &&
                                                    author.user.last_name
                                                      ? `${author.user.first_name} ${author.user.last_name}`
                                                      : `@${author.user.username}`}
                                                  </div>
                                                ))}
                                            </div>
                                          }
                                        >
                                          <div className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-2 py-0.5 rounded-md cursor-pointer text-[10px] font-bold transition-colors duration-200">
                                            +
                                            {course.authors.filter(
                                              (a: any) =>
                                                a.authorship_status === 'ACTIVE'
                                            ).length - 2}
                                          </div>
                                        </ToolTip>
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div className="h-3 w-px bg-zinc-200 hidden md:block"></div>

                              {/* Dates */}
                              <div className="flex items-center text-[11px] text-zinc-500 font-medium gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-400 capitalize">
                                    {t('courses.created_on')}
                                  </span>
                                  <span className="font-bold text-zinc-600">
                                    {new Date(
                                      course.creation_date
                                    ).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-300"></div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-zinc-400 capitalize">
                                    {t('courses.last_updated')}
                                  </span>
                                  <span className="font-bold text-zinc-600">
                                    {getRelativeTime(
                                      new Date(
                                        course.updated_at ||
                                          course.last_updated ||
                                          course.creation_date
                                      )
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 items-center">
                            {activity &&
                              activity.published == true &&
                              activity.content.paid_access != false && (
                                <AuthenticatedClientElement checkMethod="authentication">
                                  {activity.activity_type !==
                                    'TYPE_SMART_ARTICLE' && (
                                    <AIActivityAsk activity={activity} />
                                  )}
                                  {activity.activity_type !=
                                    'TYPE_ASSIGNMENT' && (
                                    <>
                                      <ActivityChapterDropdown
                                        course={course}
                                        currentActivityId={
                                          activity.activity_uuid
                                            ? activity.activity_uuid.replace(
                                                'activity_',
                                                ''
                                              )
                                            : activityid.replace(
                                                'activity_',
                                                ''
                                              )
                                        }
                                        orgslug={orgslug}
                                        trailData={trailData}
                                      />
                                      {contributorStatus === 'ACTIVE' &&
                                        activity.activity_type ==
                                          'TYPE_DYNAMIC' && (
                                          <Link
                                            href={
                                              getUriWithOrg(orgslug, '') +
                                              `/course/${courseuuid}/activity/${activityid}/edit`
                                            }
                                            className="bg-emerald-600 rounded-full px-5 drop-shadow-md flex items-center space-x-2 p-2.5 text-white hover:cursor-pointer transition delay-150 duration-300 ease-in-out"
                                          >
                                            <Edit2 size={17} />
                                            <span className="text-xs font-bold">
                                              {t('courses.contribute')}
                                            </span>
                                          </Link>
                                        )}
                                    </>
                                  )}
                                </AuthenticatedClientElement>
                              )}
                          </div>
                        </div>
                      </div>

                      {activity && activity.published == false && (
                        <div className="p-7 drop-shadow-xs rounded-lg bg-gray-800">
                          <div className="text-white">
                            <h1 className="font-bold text-2xl">
                              {t('activities.not_published_yet')}
                            </h1>
                          </div>
                        </div>
                      )}

                      {activity && activity.published == true && (
                        <>
                          {activity.content.paid_access == false ? (
                            <PaidCourseActivityDisclaimer course={course} />
                          ) : (
                            <div
                              className={`p-4 md:p-6 drop-shadow-xs rounded-lg ${bgColor} relative`}
                            >
                              <button
                                onClick={() => setIsFocusMode(true)}
                                className="absolute top-4 right-4 bg-white/80 hover:bg-white nice-shadow p-2 rounded-full cursor-pointer transition-all duration-200 group overflow-hidden z-50 pointer-events-auto"
                                title={t('activities.focus_mode')}
                              >
                                <div className="flex items-center">
                                  <Maximize2
                                    size={16}
                                    className="text-gray-700"
                                  />
                                  <span className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200 w-0 group-hover:w-auto group-hover:ml-2 whitespace-nowrap">
                                    {t('activities.focus_mode')}
                                  </span>
                                </div>
                              </button>
                              {activityContent}
                            </div>
                          )}
                        </>
                      )}

                      {/* Activity Actions below the content box */}
                      {activity &&
                        activity.published == true &&
                        activity.content.paid_access != false && (
                          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mt-4 w-full gap-4">
                            <div className="flex-1">
                              <PreviousActivityButton
                                course={course}
                                currentActivityId={activity.id}
                                orgslug={orgslug}
                              />
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-2">
                              <div className="flex justify-center">
                                <ActivityActions
                                  activity={activity}
                                  activityid={activityid}
                                  course={course}
                                  orgslug={orgslug}
                                  assignment={assignment}
                                  showNavigation={false}
                                />
                              </div>
                              <div className="flex-1">
                                <NextActivityButton
                                  course={course}
                                  currentActivityId={activity.id}
                                  orgslug={orgslug}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Fixed Activity Secondary Bar */}
                      {activity &&
                        activity.published == true &&
                        activity.content.paid_access != false && (
                          <FixedActivitySecondaryBar
                            course={course}
                            currentActivityId={activityid}
                            orgslug={orgslug}
                            activity={activity}
                          />
                        )}

                      <div style={{ height: '100px' }}></div>
                    </div>
                  </div>
                )}
              </GeneralWrapperStyled>
            )}
          </AIChatBotProvider>
        </Suspense>
      </CourseProvider>
    </>
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

  if (!nextActivity) return null

  const navigateToActivity = () => {
    const cleanCourseUuid = course.course_uuid?.replace('course_', '')
    router.push(
      getUriWithOrg(orgslug, '') +
        `/course/${cleanCourseUuid}/activity/${nextActivity.cleanUuid}`
    )
  }

  return (
    <div
      onClick={navigateToActivity}
      className="bg-gray-200 rounded-md px-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] flex flex-col p-2.5 text-gray-600 hover:cursor-pointer transition delay-150 duration-300 ease-in-out hover:bg-gray-200"
    >
      <span className="text-[10px] font-bold text-gray-500 mb-1 uppercase">
        {t('common.next')}
      </span>
      <div className="flex items-center space-x-1">
        <span className="text-sm font-semibold truncate max-w-[200px]">
          {nextActivity.name}
        </span>
        <ChevronRight size={17} />
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
