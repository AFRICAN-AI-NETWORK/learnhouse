'use client'

import React, { useMemo } from 'react'
import AuthenticatedClientElement from '@components/Security/AuthenticatedClientElement'
import NewCourseButton from '@components/Objects/StyledElements/Buttons/NewCourseButton'
import NewCollectionButton from '@components/Objects/StyledElements/Buttons/NewCollectionButton'
import ContentPlaceHolderIfUserIsNotAdmin from '@components/Objects/ContentPlaceHolder'
import Link from 'next/link'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BarChart3,
  BookCopy,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Grid2X2,
  List,
  MoreVertical,
  Play,
  SquareLibrary,
  TrendingUp,
} from 'lucide-react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { swrFetcher } from '@services/utils/ts/requests'
import useSWR from 'swr'

interface LandingClassicProps {
  courses: any[]
  collections: any[]
  orgslug: string
  org_id: string | number
}

const cleanCourseUuid = (courseUuid?: string) =>
  courseUuid?.replace('course_', '') || ''

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

  const totalCompletedSteps = trailRuns.reduce(
    (total: number, run: any) => total + (run.steps?.length || 0),
    0
  )
  const completedCourses = trailRuns.filter((run: any) => {
    const totalSteps = run.course_total_steps || 0
    return totalSteps > 0 && (run.steps?.length || 0) >= totalSteps
  }).length

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
                {['All Courses', 'In Progress', 'Completed', 'Saved'].map(
                  (filter, index) => (
                    <button
                      key={filter}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        index === 0
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AuthenticatedClientElement
                checkMethod="roles"
                ressourceType="collections"
                action="create"
                orgId={org_id}
              >
                <Link href={getUriWithOrg(orgslug, '/collections/new')}>
                  <NewCollectionButton />
                </Link>
              </AuthenticatedClientElement>
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
              <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                <button className="rounded-md bg-blue-50 p-2 text-blue-600">
                  <Grid2X2 size={18} />
                </button>
                <button className="rounded-md p-2 text-gray-500">
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {courses.slice(0, 6).map((course: any) => (
                <DashboardCourseCard
                  key={course.course_uuid}
                  course={course}
                  org={org}
                  orgslug={orgslug}
                  progress={getCourseProgress(course)}
                />
              ))}
            </div>
          ) : (
            <EmptyPanel
              icon={<BookCopy className="h-8 w-8" />}
              title={t('courses.no_courses')}
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
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InfoPanel title="Upcoming Deadlines" action="View Calendar">
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
          <InfoPanel title="Recent Activity" action="View All">
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
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
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
}: {
  course: any
  org: any
  orgslug: string
  progress: number
}) => (
  <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <Link
      href={getUriWithOrg(
        orgslug,
        `/course/${cleanCourseUuid(course.course_uuid)}`
      )}
    >
      <div className="relative">
        <CourseImage course={course} org={org} className="h-44" />
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
        <button className="text-gray-400 hover:text-gray-700">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <ProgressBar progress={progress} />
        <span className="text-sm font-semibold text-gray-700">{progress}%</span>
      </div>
      <div className="mt-4 flex items-center gap-5 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <BookCopy size={14} />
          {getCourseLessonCount(course)} Lessons
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} />
          {Math.max(
            1,
            Math.ceil((getCourseLessonCount(course) * 15) / 60)
          )}h {(getCourseLessonCount(course) * 15) % 60}m
        </span>
      </div>
    </div>
  </article>
)

const CourseImage = ({
  course,
  org,
  className,
}: {
  course: any
  org: any
  className: string
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
      className={`w-full bg-gray-900 bg-cover bg-center ${className}`}
      style={{ backgroundImage: `url(${image})` }}
    />
  )
}

const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
    <div
      className="h-full rounded-full bg-blue-600"
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
}: {
  icon: React.ReactNode
  iconClassName: string
  value: string | number
  label: string
  helper: string
}) => (
  <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClassName}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24 })}
    </div>
    <div>
      <p className="text-xl font-bold text-gray-950">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-xs font-medium text-emerald-600">{helper}</p>
    </div>
  </div>
)

const InfoPanel = ({
  title,
  action,
  children,
}: {
  title: string
  action: string
  children: React.ReactNode
}) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
      <h3 className="font-bold text-gray-950">{title}</h3>
      <button className="text-sm font-semibold text-blue-600">{action}</button>
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
