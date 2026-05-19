'use client'

import React, { useMemo, useState } from 'react'
import AuthenticatedClientElement from '@components/Security/AuthenticatedClientElement'
import NewCourseButton from '@components/Objects/StyledElements/Buttons/NewCourseButton'
import ContentPlaceHolderIfUserIsNotAdmin from '@components/Objects/ContentPlaceHolder'
import Link from 'next/link'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BarChart3,
  BookMinus,
  BookCopy,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FilePenLine,
  MoreVertical,
  Play,
  Settings2,
  SquareLibrary,
  TrendingUp,
} from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { revalidateTags, swrFetcher } from '@services/utils/ts/requests'
import useSWR from 'swr'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
import { deleteCourseFromBackend } from '@services/courses/courses'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface LandingClassicProps {
  courses: any[]
  collections: any[]
  orgslug: string
  org_id: string | number
}

const cleanCourseUuid = (courseUuid?: string) =>
  courseUuid?.replace('course_', '') || ''

type CourseTab = 'all' | 'in-progress' | 'completed'

const courseTabs: Array<{ label: string; value: CourseTab }> = [
  { label: 'All Courses', value: 'all' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
]

function LandingClassic({
  courses,
  collections,
  orgslug,
  org_id,
}: LandingClassicProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const accessToken = session?.data?.tokens?.access_token
  const [activeCourseTab, setActiveCourseTab] = useState<CourseTab>('all')
  const username =
    session?.data?.user?.username ||
    session?.data?.user?.first_name ||
    session?.data?.user?.email ||
    'there'

  const { data: trail } = useSWR(
    org?.id ? `${getAPIUrl()}trail/org/${org.id}/trail` : null,
    (url) => swrFetcher(url, accessToken)
  )

  const trailRuns = useMemo(() => trail?.runs || [], [trail])
  const continueRun = trailRuns[0]
  const continueCourse = continueRun?.course || courses[0]

  const getRunForCourse = (course: any) =>
    trailRuns.find(
      (run: any) =>
        cleanCourseUuid(run.course?.course_uuid) ===
        cleanCourseUuid(course?.course_uuid)
    )

  const getCourseProgress = (course: any) => {
    const run = getRunForCourse(course)
    const totalSteps = run?.course_total_steps || getCourseLessonCount(course)
    const completedSteps = run?.steps?.length || 0

    if (!totalSteps) return 0
    return Math.min(100, Math.round((completedSteps / totalSteps) * 100))
  }

  const getCourseTotalLessons = (course: any) => {
    const run = getRunForCourse(course)

    return run?.course_total_steps || getCourseLessonCount(course)
  }

  const totalCompletedSteps = trailRuns.reduce(
    (total: number, run: any) => total + (run.steps?.length || 0),
    0
  )
  const completedCourses = trailRuns.filter((run: any) => {
    const totalSteps = run.course_total_steps || 0
    return totalSteps > 0 && (run.steps?.length || 0) >= totalSteps
  }).length
  const displayedCourses = courses.filter((course: any) => {
    const progress = getCourseProgress(course)

    if (activeCourseTab === 'in-progress') {
      return progress > 0 && progress < 100
    }

    if (activeCourseTab === 'completed') {
      return progress >= 100
    }

    return true
  })

  return (
    <main className="min-h-screen w-full bg-[#f8fafc]">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-6">
          <h1 className="text-2xl font-bold tracking-normal text-gray-950 sm:text-3xl">
            Welcome back, {username}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-base text-gray-600">
            Let&apos;s continue your learning journey.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-bold text-gray-950">
              Continue Learning
            </h2>
            <Link
              href={getUriWithOrg(orgslug, '/trail')}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          {continueCourse ? (
            <ContinueLearningCard
              course={continueCourse}
              run={continueRun}
              org={org}
              orgslug={orgslug}
              progress={getCourseProgress(continueCourse)}
            />
          ) : (
            <EmptyPanel
              icon={<BookOpen className="h-8 w-8" />}
              title={t('courses.no_courses')}
              description={
                <ContentPlaceHolderIfUserIsNotAdmin
                  text={t('courses.create_courses_placeholder')}
                />
              }
            />
          )}
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-950">Your Courses</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {courseTabs.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveCourseTab(tab.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      activeCourseTab === tab.value
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AuthenticatedClientElement
                ressourceType="courses"
                action="create"
                checkMethod="roles"
                orgId={org_id}
              >
                <Link href={getUriWithOrg(orgslug, '/courses?new=true')}>
                  <NewCourseButton />
                </Link>
              </AuthenticatedClientElement>
              <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm">
                Recently Added
              </button>
            </div>
          </div>

          {displayedCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {displayedCourses.slice(0, 6).map((course: any) => (
                <DashboardCourseCard
                  key={course.course_uuid}
                  course={course}
                  org={org}
                  orgslug={orgslug}
                  progress={getCourseProgress(course)}
                  lessonCount={getCourseTotalLessons(course)}
                />
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={<BookCopy className="h-8 w-8" />}
              title={
                courses.length > 0
                  ? t('courses.no_courses_found')
                  : t('courses.no_courses')
              }
              description={
                <ContentPlaceHolderIfUserIsNotAdmin
                  text={t('courses.create_courses_placeholder')}
                />
              }
            />
          )}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<BookOpen fill="currentColor" />}
            iconClassName="bg-blue-50 text-blue-600"
            value={courses.length}
            label="Courses Enrolled"
            helper={`${collections.length} collections available`}
          />
          <StatCard
            icon={<Clock3 />}
            iconClassName="bg-emerald-50 text-emerald-600"
            value={`${Math.floor((totalCompletedSteps * 15) / 60)}h ${
              (totalCompletedSteps * 15) % 60
            }m`}
            label="Time Spent"
            helper="Estimated from completed lessons"
          />
          <StatCard
            icon={<BarChart3 />}
            iconClassName="bg-violet-50 text-violet-600"
            value={`${averageProgress(courses, getCourseProgress)}%`}
            label="Average Progress"
            helper="Across enrolled courses"
          />
          <StatCard
            icon={<Award fill="currentColor" />}
            iconClassName="bg-amber-50 text-amber-500"
            value={completedCourses}
            label="Certificates Earned"
            helper="View all certificates"
            helperHref={getUriWithOrg(orgslug, '/trail')}
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InfoPanel
            title="Upcoming Deadlines"
            action="View Calender"
            actionHref={getUriWithOrg(orgslug, '/trail')}
          >
            {continueCourse ? (
              <PanelRow
                icon={<CalendarDays size={16} />}
                title={`${continueCourse.name} - Next lesson`}
                detail="Keep your streak warm"
              />
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">
                No upcoming deadlines yet.
              </p>
            )}
          </InfoPanel>
          <InfoPanel
            title="Recent Activity"
            action="View All"
            actionHref={getUriWithOrg(orgslug, '/trail')}
          >
            {trailRuns.length > 0 ? (
              trailRuns
                .slice(0, 3)
                .map((run: any) => (
                  <PanelRow
                    key={run.course?.course_uuid}
                    icon={<CheckCircle2 size={16} />}
                    title={`You progressed in ${run.course?.name}`}
                    detail={`${run.steps?.length || 0} lessons completed`}
                  />
                ))
            ) : (
              <p className="px-5 py-6 text-sm text-gray-500">
                Start a course to see recent activity here.
              </p>
            )}
          </InfoPanel>
        </section>

        {collections.length === 0 && (
          <section className="mt-6">
            <EmptyPanel
              icon={<SquareLibrary className="h-8 w-8" />}
              title={t('collections.no_collections')}
              description={
                <ContentPlaceHolderIfUserIsNotAdmin
                  text={t('collections.create_collections_placeholder')}
                />
              }
            />
          </section>
        )}
      </div>
    </main>
  )
}

const ContinueLearningCard = ({
  course,
  run,
  org,
  orgslug,
  progress,
}: {
  course: any
  run?: any
  org: any
  orgslug: string
  progress: number
}) => {
  const totalLessons = run?.course_total_steps || getCourseLessonCount(course)
  const completedLessons = run?.steps?.length || 0
  const remainingLessons = Math.max(totalLessons - completedLessons, 0)

  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[280px_1fr_190px] lg:items-center">
      <CourseImage course={course} org={org} className="h-40 lg:h-32" />
      <div>
        <h3 className="text-lg font-bold text-gray-950">{course.name}</h3>
        <p className="mt-1 text-sm text-gray-500 line-clamp-1">
          {course.description || 'Continue where you left off'}
        </p>
        <div className="mt-5 flex items-center gap-4">
          <ProgressBar progress={progress} />
          <span className="shrink-0 text-sm text-gray-600">
            {progress}% complete
          </span>
        </div>
        <Link
          href={getUriWithOrg(
            orgslug,
            `/course/${cleanCourseUuid(course.course_uuid)}`
          )}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-50"
        >
          <Play size={16} fill="currentColor" />
          Resume Course
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm lg:grid-cols-1">
        <MetricLine
          icon={<Clock3 size={20} />}
          value={`${Math.max(1, Math.ceil((remainingLessons * 15) / 60))}h ${(remainingLessons * 15) % 60}m`}
          label="remaining"
        />
        <MetricLine
          icon={<TrendingUp size={20} />}
          value={`${completedLessons} / ${totalLessons || 0}`}
          label="Lessons"
        />
      </div>
    </div>
  )
}

const DashboardCourseCard = ({
  course,
  org,
  orgslug,
  progress,
  lessonCount,
}: {
  course: any
  org: any
  orgslug: string
  progress: number
  lessonCount: number
}) => (
  <article className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <AdminCourseCardActions course={course} orgslug={orgslug} />
    <Link
      href={getUriWithOrg(
        orgslug,
        `/course/${cleanCourseUuid(course.course_uuid)}`
      )}
    >
      <div className="relative">
        <CourseImage course={course} org={org} className="h-50" />
        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold uppercase text-white ${
            course.is_paid ? 'bg-blue-600' : 'bg-emerald-600'
          }`}
        >
          {course.is_paid ? 'Paid' : 'Free'}
        </span>
      </div>
    </Link>
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={getUriWithOrg(
              orgslug,
              `/course/${cleanCourseUuid(course.course_uuid)}`
            )}
            className="text-base font-bold text-gray-950 hover:text-blue-600"
          >
            {course.name}
          </Link>
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">
            {course.description || 'African AI Network'}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <ProgressBar
          progress={progress}
          color={progress >= 100 ? 'green' : 'blue'}
        />
        <span className="text-sm font-semibold text-gray-700">{progress}%</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-5 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <BookCopy size={14} />
          {lessonCount} Lessons
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} />
          {Math.max(1, Math.ceil((lessonCount * 15) / 60))}h{' '}
          {(lessonCount * 15) % 60}m
        </span>
        <Link
          href={getUriWithOrg(
            orgslug,
            `/course/${cleanCourseUuid(course.course_uuid)}`
          )}
          className="text-sm font-semibold text-blue-400 hover:text-blue-700"
        >
          Start learning
        </Link>
      </div>
    </div>
  </article>
)

const AdminCourseCardActions = ({
  course,
  orgslug,
}: {
  course: any
  orgslug: string
}) => {
  const { t } = useTranslation()
  const router = useRouter()
  const session = useLHSession() as any

  const deleteCourse = async () => {
    const toastId = toast.loading(t('courses.deleting_course'))

    try {
      await deleteCourseFromBackend(
        course.course_uuid,
        session.data?.tokens?.access_token
      )
      await revalidateTags(['courses'], orgslug)
      toast.success(t('courses.course_deleted_success'))
      router.refresh()
    } catch (error) {
      toast.error(t('courses.course_deleted_error'))
    } finally {
      toast.dismiss(toastId)
    }
  }

  return (
    <AuthenticatedClientElement
      action="update"
      ressourceType="courses"
      checkMethod="roles"
      orgId={course.org_id}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1.5 text-gray-700 shadow-md backdrop-blur-sm transition-all hover:bg-white">
            <MoreVertical size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link
              prefetch
              href={getUriWithOrg(
                orgslug,
                `/dash/courses/course/${cleanCourseUuid(course.course_uuid)}/content`
              )}
              className="flex cursor-pointer items-center"
            >
              <FilePenLine className="mr-2 h-4 w-4" />
              {t('courses.edit_content')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              prefetch
              href={getUriWithOrg(
                orgslug,
                `/dash/courses/course/${cleanCourseUuid(course.course_uuid)}/general`
              )}
              className="flex cursor-pointer items-center"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              {t('common.settings')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <ConfirmationModal
              confirmationButtonText={t('courses.delete_course')}
              confirmationMessage={t('courses.delete_course_confirm')}
              dialogTitle={t('courses.delete_course_title', {
                name: course.name,
              })}
              dialogTrigger={
                <button className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50">
                  <BookMinus className="mr-2 h-4 w-4" />
                  {t('courses.delete_course')}
                </button>
              }
              functionToExecute={deleteCourse}
              status="warning"
            />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </AuthenticatedClientElement>
  )
}

const CourseImage = ({
  course,
  org,
  className,
  fit = 'cover',
}: {
  course: any
  org: any
  className: string
  fit?: 'cover' | 'contain'
}) => {
  const image = course.thumbnail_image
    ? getCourseThumbnailMediaDirectory(
        org?.org_uuid,
        course.course_uuid,
        course.thumbnail_image
      )
    : '../empty_thumbnail.png'

  return (
    <div
      className={`w-full bg-gray-900 bg-cover rounded-b-2xl ${
        fit === 'contain' ? 'bg-contain bg-no-repeat' : 'bg-cover'
      } ${className}`}
      style={{ backgroundImage: `url(${image})` }}
    />
  )
}

const ProgressBar = ({
  progress,
  color = 'blue',
}: {
  progress: number
  color?: 'blue' | 'green'
}) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
    <div
      className={`h-full rounded-full ${
        color === 'green' ? 'bg-emerald-600' : 'bg-blue-600'
      }`}
      style={{ width: `${progress}%` }}
    />
  </div>
)

const MetricLine = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) => (
  <div className="flex items-center gap-3 text-gray-600">
    {icon}
    <div>
      <p className="font-semibold text-gray-800">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  </div>
)

const StatCard = ({
  icon,
  iconClassName,
  value,
  label,
  helper,
  helperHref,
}: {
  icon: React.ReactElement<{ size?: number }>
  iconClassName: string
  value: string | number
  label: string
  helper: string
  helperHref?: string
}) => (
  <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClassName}`}
    >
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <p className="text-xl font-bold text-gray-950">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      {helperHref ? (
        <Link
          href={helperHref}
          className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {helper}
        </Link>
      ) : (
        <p className="mt-1 text-xs font-medium text-emerald-600">{helper}</p>
      )}
    </div>
  </div>
)

const InfoPanel = ({
  title,
  action,
  actionHref,
  children,
}: {
  title: string
  action?: string
  actionHref?: string
  children: React.ReactNode
}) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
      <h3 className="font-bold text-gray-950">{title}</h3>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          {action}
        </Link>
      )}
    </div>
    <div className="divide-y divide-gray-100">{children}</div>
  </div>
)

const PanelRow = ({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode
  title: string
  detail: string
}) => (
  <div className="flex items-center gap-3 px-5 py-4">
    <div className="text-blue-600">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  </div>
)

const EmptyPanel = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: React.ReactNode
}) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-12 text-center text-gray-500">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
    <p className="mt-1 max-w-sm text-sm">{description}</p>
  </div>
)

const getCourseLessonCount = (course: any) => {
  if (!course?.chapters) return 0
  return course.chapters.reduce(
    (total: number, chapter: any) => total + (chapter.activities?.length || 0),
    0
  )
}

const averageProgress = (
  courses: any[],
  getCourseProgress: (course: any) => number
) => {
  if (!courses.length) return 0
  const total = courses.reduce(
    (sum: number, course: any) => sum + getCourseProgress(course),
    0
  )
  return Math.round(total / courses.length)
}

export default LandingClassic
