'use client'
import { useMediaQuery } from 'usehooks-ts'
import {
  Check,
  FileText,
  ListTree,
  Video,
  X,
  StickyNote,
  Backpack,
  ArrowRight,
  Trophy,
} from 'lucide-react'
import { getUriWithOrg } from '@services/config/config'
import Link from 'next/link'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface ActivityChapterDropdownProps {
  course: any
  currentActivityId: string
  orgslug: string
  trailData?: any
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
      courseActivity.cleanUuid ===
        activity.activity_uuid?.replace('activity_', '')
  )

  if (activityIndex <= 0) return false

  return !allActivities
    .slice(0, activityIndex)
    .every((courseActivity: any) =>
      isActivityCompleteInRun(courseActivity, run)
    )
}

export default function ActivityChapterDropdown(
  props: ActivityChapterDropdownProps
): React.ReactNode {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Clean up course UUID by removing 'course_' prefix if it exists
  const cleanCourseUuid = props.course.course_uuid?.replace('course_', '')
  const allActivities = React.useMemo(() => {
    const activities: any[] = []

    props.course.chapters?.forEach((chapter: any) => {
      chapter.activities?.forEach((activity: any) => {
        activities.push({
          ...activity,
          cleanUuid: activity.activity_uuid?.replace('activity_', ''),
        })
      })
    })

    return activities
  }, [props.course.chapters])
  const run = props.trailData?.runs?.find((run: any) => {
    const runCourseUuid =
      run.course?.course_uuid || run.course_uuid || run.course?.uuid
    return runCourseUuid?.replace('course_', '') === cleanCourseUuid
  })

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  // Function to get the appropriate icon for activity type
  const getActivityTypeIcon = (activityType: string) => {
    switch (activityType) {
      case 'TYPE_VIDEO':
        return <Video size={10} />
      case 'TYPE_DOCUMENT':
        return <FileText size={10} />
      case 'TYPE_DYNAMIC':
        return <StickyNote size={10} />
      case 'TYPE_ASSIGNMENT':
        return <Backpack size={10} />
      default:
        return <FileText size={10} />
    }
  }

  const getActivityTypeLabel = (activityType: string) => {
    switch (activityType) {
      case 'TYPE_VIDEO':
        return t('activities.video')
      case 'TYPE_DOCUMENT':
        return t('activities.document')
      case 'TYPE_DYNAMIC':
        return t('activities.page')
      case 'TYPE_ASSIGNMENT':
        return t('activities.assignment')
      default:
        return t('activities.learning_material')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="bg-white rounded-full px-5 nice-shadow flex items-center space-x-2 p-2.5 text-gray-700 hover:bg-gray-50 transition delay-150 duration-300 ease-in-out"
        aria-label="View all activities"
        title="View all activities"
      >
        <ListTree size={17} />
        <span className="text-xs font-bold">{t('courses.chapters')}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 ${isMobile ? 'right-0 w-[90vw] sm:w-72' : 'right-0 w-72'} max-h-[70vh] cursor-pointer overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 py-1 animate-in fade-in duration-200`}
        >
          <div className="px-3 py-1.5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-800">
              {t('courses.course_content')}
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="py-0.5">
            {props.course.chapters.map((chapter: any, index: number) => (
              <div key={chapter.id} className="mb-1">
                <div className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 border-y border-gray-100 flex items-center">
                  <div className="flex items-center space-x-1.5">
                    <div className="bg-gray-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {index + 1}
                    </div>
                    <span>{chapter.name}</span>
                  </div>
                </div>
                <div className="py-0.5">
                  {chapter.activities.map((activity: any) => {
                    const cleanActivityUuid = activity.activity_uuid?.replace(
                      'activity_',
                      ''
                    )
                    const isCurrent =
                      cleanActivityUuid ===
                      props.currentActivityId.replace('activity_', '')

                    const isComplete = isActivityCompleteInRun(activity, run)
                    const isLocked = isActivityLockedByProgress(
                      activity,
                      allActivities,
                      run
                    )

                    const rowContent = (
                      <div
                        className={`group transition-colors px-3 py-2 ${
                          isLocked
                            ? 'opacity-50 cursor-not-allowed select-none'
                            : 'hover:bg-neutral-50'
                        } ${
                          isCurrent
                            ? 'bg-neutral-50 border-l-2 border-neutral-300 pl-2.5 font-medium'
                            : ''
                        }`}
                      >
                        <div className="flex space-x-2 items-center">
                          <div className="flex items-center">
                            {isLocked ? (
                              <svg
                                className="w-3.5 h-3.5 text-neutral-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            ) : isComplete ? (
                              <div className="relative cursor-pointer">
                                <Check
                                  size={14}
                                  className="stroke-[2.5] text-teal-600"
                                />
                              </div>
                            ) : (
                              <div className="text-neutral-300 cursor-pointer">
                                <Check size={14} className="stroke-2" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col grow">
                            <div className="flex items-center space-x-1.5 w-full">
                              <p
                                className={`text-sm font-medium ${
                                  isLocked
                                    ? 'text-neutral-400'
                                    : 'text-neutral-600 group-hover:text-neutral-800'
                                } transition-colors`}
                              >
                                {activity.name}
                              </p>
                              {activity.points !== undefined &&
                                activity.points > 0 && (
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                                    {activity.points} pts
                                  </span>
                                )}
                              {isCurrent && (
                                <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full text-[10px] font-medium animate-pulse">
                                  <span>{t('activities.current')}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 mt-0.5 text-neutral-400">
                              {getActivityTypeIcon(activity.activity_type)}
                              <span className="text-[10px] font-medium">
                                {getActivityTypeLabel(activity.activity_type)}
                              </span>
                            </div>
                          </div>
                          <div className="text-neutral-300 group-hover:text-neutral-400 transition-colors cursor-pointer">
                            {isLocked ? (
                              <svg
                                className="w-3.5 h-3.5 text-neutral-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            ) : (
                              <ArrowRight size={12} />
                            )}
                          </div>
                        </div>
                      </div>
                    )

                    if (isLocked) {
                      return <div key={activity.id}>{rowContent}</div>
                    }

                    return (
                      <Link
                        key={activity.id}
                        href={
                          getUriWithOrg(props.orgslug, '') +
                          `/course/${cleanCourseUuid}/activity/${cleanActivityUuid}`
                        }
                        prefetch={false}
                        onClick={() => setIsOpen(false)}
                      >
                        {rowContent}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Certificate Link if course is completed or has certification */}
            {props.course.certification && (
              <Link
                href={
                  getUriWithOrg(props.orgslug, '') +
                  `/course/${cleanCourseUuid}/activity/end`
                }
                prefetch={false}
                onClick={() => setIsOpen(false)}
              >
                <div className="mx-3 my-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors group">
                  <div className="flex items-center space-x-3">
                    <div className="bg-emerald-600 p-2 rounded-full text-white">
                      <Trophy size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-emerald-900">
                        {t('certificate.get_certificate')}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {t('certificate.certificate_of_completion')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
