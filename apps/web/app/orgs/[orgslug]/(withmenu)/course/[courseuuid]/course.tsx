'use client'
import Link from 'next/link'
import React, { useMemo, useState } from 'react'
import { getUriWithOrg, getAPIUrl } from '@services/config/config'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { swrFetcher } from '@services/utils/ts/requests'
import ActivityIndicators from '@components/Pages/Courses/ActivityIndicators'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import {
  ArrowRight,
  Award,
  Backpack,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  File,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Square,
  StickyNote,
  Target,
  Video,
} from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import { CourseProvider } from '@components/Contexts/CourseContext'
import { useMediaQuery } from 'usehooks-ts'
import CoursesActions from '@components/Objects/Courses/CourseActions/CoursesActions'
import CourseActionsMobile from '@components/Objects/Courses/CourseActions/CourseActionsMobile'
import CourseAuthors from '@components/Objects/Courses/CourseAuthors/CourseAuthors'
import CourseSchedulePanel from '@components/Objects/Courses/CourseSchedule/CourseSchedulePanel'
import CourseBreadcrumbs from '@components/Pages/Courses/CourseBreadcrumbs'
import BundleUpsellBanner from '@components/Objects/BundleUpsellBanner'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'

const CourseClient = (props: any) => {
  const { t } = useTranslation()
  const [activeThumbnailType, setActiveThumbnailType] = useState<
    'image' | 'video'
  >('image')
  const courseuuid = props.courseuuid
  const orgslug = props.orgslug
  const course = props.course
  const org = useOrg() as any
  const isMobile = useMediaQuery('(max-width: 768px)')
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const courseLearnings = course?.learnings

  const { data: trailData } = useSWR(
    `${getAPIUrl()}trail/org/${org?.id}/trail`,
    (url) => swrFetcher(url, access_token)
  )

  const cleanCourseUuid = course?.course_uuid?.replace('course_', '')

  const currentRun = useMemo(
    () =>
      trailData?.runs?.find((run: any) => {
        const cleanRunCourseUuid = run.course?.course_uuid?.replace(
          'course_',
          ''
        )
        return cleanRunCourseUuid === cleanCourseUuid
      }),
    [cleanCourseUuid, trailData?.runs]
  )

  const totalActivities = useMemo(
    () =>
      course?.chapters?.reduce(
        (sum: number, chapter: any) => sum + (chapter.activities?.length || 0),
        0
      ) || 0,
    [course?.chapters]
  )

  const completedActivities = currentRun?.steps?.length || 0
  const progressPercentage =
    totalActivities > 0
      ? Math.min(100, Math.round((completedActivities / totalActivities) * 100))
      : 0
  const estimatedMinutes = Math.max(totalActivities * 15, 15)

  const learnings = useMemo(() => {
    if (!courseLearnings) {
      return []
    }

    try {
      const parsedLearnings = JSON.parse(courseLearnings)
      if (Array.isArray(parsedLearnings)) {
        return parsedLearnings
      }
    } catch {
      // Legacy comma-separated values are handled below.
    }

    return courseLearnings.split(',').map((text: string, index: number) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `learning-${index}`,
      text: text.trim(),
      emoji: null,
    }))
  }, [courseLearnings])

  const [expandedChapters, setExpandedChapters] = useState<{
    [key: string]: boolean
  }>(() => {
    if (!course?.chapters) return {}
    const defaults: { [key: string]: boolean } = {}
    course.chapters.forEach((chapter: any, idx: number) => {
      defaults[chapter.chapter_uuid] = idx === 0 || totalActivities <= 5
    })
    return defaults
  })

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
      case 'TYPE_SMART_ARTICLE':
        return 'Interactive Article'
      default:
        return t('activities.learning_material')
    }
  }

  const isActivityDone = (activity: any) => {
    if (currentRun) {
      return currentRun.steps.find(
        (step: any) => step.activity_id == activity.id
      )
    }
    return false
  }

  const isActivityCurrent = (activity: any) => {
    const activity_uuid = activity.activity_uuid.replace('activity_', '')
    return props.current_activity && props.current_activity == activity_uuid
  }

  if (!course || !org) {
    return <PageLoading />
  }

  return (
    <>
      <main className="min-h-screen bg-[#f8fafc]">
        <GeneralWrapperStyled>
          <div className="space-y-6 py-6">
            <CourseBreadcrumbs course={course} orgslug={orgslug} />

            <BundleUpsellBanner
              course={course}
              orgslug={orgslug}
              orgId={org?.id}
            />

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:p-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
                    <div className="min-w-0">
                      <div className="mb-4 flex flex-wrap gap-2">
                        <CourseChip icon={<BookOpen size={14} />}>
                          {totalActivities}{' '}
                          {totalActivities === 1
                            ? 'activity'
                            : t('activities.activities')}
                        </CourseChip>
                        <CourseChip icon={<Clock3 size={14} />}>
                          {formatDuration(estimatedMinutes)}
                        </CourseChip>
                        <CourseChip icon={<Award size={14} />}>
                          Certificate
                        </CourseChip>
                      </div>

                      <h1 className="text-3xl font-bold leading-tight text-gray-950 md:text-4xl">
                        {course.name}
                      </h1>
                      {course.description && (
                        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600 line-clamp-3">
                          {course.description}
                        </p>
                      )}
                      {course.about && (
                        <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-gray-600 line-clamp-4">
                          {course.about}
                        </p>
                      )}

                      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <HeroStat
                          label={t('courses.course_progress')}
                          value={`${progressPercentage}%`}
                        />
                        <HeroStat
                          label={t('common.completed')}
                          value={`${completedActivities}/${totalActivities}`}
                        />
                        <HeroStat
                          label="Chapters"
                          value={course.chapters?.length || 0}
                        />
                      </div>
                    </div>

                    <CourseMedia
                      course={course}
                      org={org}
                      activeThumbnailType={activeThumbnailType}
                      setActiveThumbnailType={setActiveThumbnailType}
                      t={t}
                    />
                  </div>
                </div>

                {currentRun && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <ActivityIndicators
                      course_uuid={props.course.course_uuid}
                      orgslug={orgslug}
                      course={course}
                      trailData={trailData}
                    />
                  </div>
                )}

                <CourseSchedulePanel courseUuid={props.course.course_uuid} />

                {course.about && (
                  <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-950">
                      Course overview
                    </h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                      {course.about}
                    </p>
                  </section>
                )}

                {learnings.length > 0 && learnings[0]?.text !== 'null' && (
                  <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <Target size={20} className="text-blue-600" />
                      <h2 className="text-xl font-bold text-gray-950">
                        {t('courses.what_you_will_learn')}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {learnings.map((learning: any) => {
                        const learningText =
                          typeof learning === 'string'
                            ? learning
                            : learning.text
                        const learningEmoji =
                          typeof learning === 'string' ? null : learning.emoji
                        const learningId =
                          typeof learning === 'string'
                            ? learning
                            : learning.id || learning.text

                        if (!learningText) return null

                        return (
                          <LearningItem
                            key={learningId}
                            learning={learning}
                            learningText={learningText}
                            learningEmoji={learningEmoji}
                          />
                        )
                      })}
                    </div>
                  </section>
                )}

                <section className="mb-10">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-950 md:text-2xl">
                        {t('courses.course_lessons')}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {totalActivities}{' '}
                        {totalActivities === 1
                          ? 'activity'
                          : t('activities.activities')}{' '}
                        across {course.chapters?.length || 0} chapters
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {course.chapters.map((chapter: any, idx: number) => {
                      const isExpanded =
                        expandedChapters[chapter.chapter_uuid] ?? idx === 0
                      const completedInChapter = chapter.activities.filter(
                        (activity: any) => isActivityDone(activity)
                      ).length

                      return (
                        <ChapterCard
                          key={
                            chapter.chapter_uuid || `chapter-${chapter.name}`
                          }
                          chapter={chapter}
                          chapterIndex={idx}
                          completedInChapter={completedInChapter}
                          isExpanded={isExpanded}
                          onToggle={() =>
                            setExpandedChapters((prev) => ({
                              ...prev,
                              [chapter.chapter_uuid]: !isExpanded,
                            }))
                          }
                          courseuuid={courseuuid}
                          orgslug={orgslug}
                          getActivityTypeLabel={getActivityTypeLabel}
                          isActivityDone={isActivityDone}
                          isActivityCurrent={isActivityCurrent}
                          t={t}
                        />
                      )
                    })}
                  </div>
                </section>
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <CoursesActions
                  courseuuid={courseuuid}
                  orgslug={orgslug}
                  course={course}
                  trailData={trailData}
                />

                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <CourseProvider courseuuid={course.course_uuid}>
                    <CourseAuthors authors={course.authors} />
                  </CourseProvider>
                </div>
              </aside>
            </section>
          </div>
        </GeneralWrapperStyled>
      </main>

      {isMobile && (
        <CourseActionsMobile
          courseuuid={courseuuid}
          orgslug={orgslug}
          course={course}
          trailData={trailData}
        />
      )}
    </>
  )
}

const CourseMedia = ({
  course,
  org,
  activeThumbnailType,
  setActiveThumbnailType,
  t,
}: {
  course: any
  org: any
  activeThumbnailType: 'image' | 'video'
  setActiveThumbnailType: (type: 'image' | 'video') => void
  t: any
}) => {
  const showVideo =
    course.thumbnail_type === 'video' ||
    (course.thumbnail_type === 'both' && activeThumbnailType === 'video')
  const showImage =
    course.thumbnail_type === 'image' ||
    (course.thumbnail_type === 'both' && activeThumbnailType === 'image') ||
    !course.thumbnail_type

  return (
    <div className="relative h-[240px] overflow-hidden rounded-lg border border-gray-200 bg-gray-900 shadow-sm lg:h-[310px]">
      {course.thumbnail_type === 'both' && (
        <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/30 p-1 backdrop-blur-sm">
          <div className="flex gap-1">
            <MediaToggleButton
              isActive={activeThumbnailType === 'image'}
              onClick={() => setActiveThumbnailType('image')}
              icon={<ImageIcon size={12} />}
              label={t('courses.image')}
            />
            <MediaToggleButton
              isActive={activeThumbnailType === 'video'}
              onClick={() => setActiveThumbnailType('video')}
              icon={<Video size={12} />}
              label={t('activities.video')}
            />
          </div>
        </div>
      )}

      {showVideo && course.thumbnail_video ? (
        <video
          src={getCourseThumbnailMediaDirectory(
            org?.org_uuid,
            course?.course_uuid,
            course?.thumbnail_video
          )}
          className="h-full w-full bg-black object-cover"
          controls
          autoPlay
          muted
          preload="metadata"
          playsInline
        />
      ) : showImage && course.thumbnail_image ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url(${getCourseThumbnailMediaDirectory(
              org?.org_uuid,
              course?.course_uuid,
              course?.thumbnail_image
            )})`,
          }}
        />
      ) : (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: `url('../empty_thumbnail.png')`,
            backgroundSize: 'auto',
          }}
        />
      )}
    </div>
  )
}

const MediaToggleButton = ({
  isActive,
  onClick,
  icon,
  label,
}: {
  isActive: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
      isActive
        ? 'bg-white text-gray-900 shadow-sm'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`}
  >
    {icon}
    {label}
  </button>
)

const CourseChip = ({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
    {icon}
    {children}
  </span>
)

const HeroStat = ({
  label,
  value,
}: {
  label: string
  value: string | number
}) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
    <p className="text-lg font-bold text-gray-950">{value}</p>
    <p className="mt-0.5 text-xs text-gray-500">{label}</p>
  </div>
)

const LearningItem = ({
  learning,
  learningText,
  learningEmoji,
}: {
  learning: any
  learningText: string
  learningEmoji: string | null
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      {learningEmoji ? <span>{learningEmoji}</span> : <Check size={14} />}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-gray-700">{learningText}</p>
      {learning.link && (
        <a
          href={learning.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          View resource
          <ArrowRight size={12} />
        </a>
      )}
    </div>
  </div>
)

const ChapterCard = ({
  chapter,
  chapterIndex,
  completedInChapter,
  isExpanded,
  onToggle,
  courseuuid,
  orgslug,
  getActivityTypeLabel,
  isActivityDone,
  isActivityCurrent,
  t,
}: {
  chapter: any
  chapterIndex: number
  completedInChapter: number
  isExpanded: boolean
  onToggle: () => void
  courseuuid: string
  orgslug: string
  getActivityTypeLabel: (activityType: string) => string
  isActivityDone: (activity: any) => any
  isActivityCurrent: (activity: any) => boolean
  t: any
}) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-gray-50"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
        {chapterIndex + 1}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold text-gray-950">
          {chapter.name}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
          <Layers size={15} />
          {completedInChapter}/{chapter.activities.length}{' '}
          {t('common.completed')}
        </p>
      </div>
      <ChevronDown
        size={20}
        className={`text-gray-500 transition-transform ${
          isExpanded ? 'rotate-180' : ''
        }`}
      />
    </button>

    {isExpanded && (
      <div className="divide-y divide-gray-100 border-t border-gray-100">
        {chapter.activities.map((activity: any) => (
          <ActivityRow
            key={activity.activity_uuid}
            activity={activity}
            courseuuid={courseuuid}
            orgslug={orgslug}
            getActivityTypeLabel={getActivityTypeLabel}
            isActivityDone={isActivityDone}
            isActivityCurrent={isActivityCurrent}
            t={t}
          />
        ))}
      </div>
    )}
  </div>
)

const ActivityRow = ({
  activity,
  courseuuid,
  orgslug,
  getActivityTypeLabel,
  isActivityDone,
  isActivityCurrent,
  t,
}: {
  activity: any
  courseuuid: string
  orgslug: string
  getActivityTypeLabel: (activityType: string) => string
  isActivityDone: (activity: any) => any
  isActivityCurrent: (activity: any) => boolean
  t: any
}) => {
  const isDone = isActivityDone(activity)
  const isCurrent = isActivityCurrent(activity)

  return (
    <Link
      href={
        getUriWithOrg(orgslug, '') +
        `/course/${courseuuid}/activity/${activity.activity_uuid.replace(
          'activity_',
          ''
        )}`
      }
      rel="noopener noreferrer"
      prefetch={false}
      className="group block px-4 py-4 transition-colors hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Square
            size={17}
            className={isDone ? 'text-emerald-600' : 'text-gray-300'}
          />
          {isDone && (
            <Check
              size={17}
              className="absolute left-0 top-0 text-emerald-600"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-950 group-hover:text-blue-600">
              {activity.name}
            </p>
            {isCurrent && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                {t('activities.current')}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <ActivityTypeIcon activityType={activity.activity_type} />
            {getActivityTypeLabel(activity.activity_type)}
          </div>
        </div>
        <ArrowRight
          size={16}
          className="text-gray-300 group-hover:text-gray-500"
        />
      </div>
    </Link>
  )
}

const ActivityTypeIcon = ({ activityType }: { activityType: string }) => {
  if (activityType === 'TYPE_DYNAMIC') return <StickyNote size={12} />
  if (activityType === 'TYPE_VIDEO') return <Video size={12} />
  if (activityType === 'TYPE_DOCUMENT') return <File size={12} />
  if (activityType === 'TYPE_ASSIGNMENT') return <Backpack size={12} />
  if (activityType === 'TYPE_SMART_ARTICLE') return <Sparkles size={12} />
  return <BookOpen size={12} />
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) return `${remainingMinutes}m`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}m`
}

export default CourseClient
