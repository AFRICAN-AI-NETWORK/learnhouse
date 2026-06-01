'use client'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { getAssignmentsFromACourse } from '@services/courses/assignments'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { swrFetcher } from '@services/utils/ts/requests'
import {
  EllipsisVertical,
  GalleryVerticalEnd,
  Info,
  Layers2,
  UserRoundPen,
} from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'

function AssignmentsHome() {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const org = useOrg() as any
  const [courseAssignments, setCourseAssignments] = React.useState<any[]>([])

  const { data: courses } = useSWR(
    `${getAPIUrl()}courses/org_slug/${org?.slug}/page/1/limit/50`,
    (url) => swrFetcher(url, access_token)
  )

  const getAvailableAssignmentsForCourse = React.useCallback(
    async (course_uuid: string) => {
      const res = await getAssignmentsFromACourse(course_uuid, access_token)
      return res.data
    },
    [access_token]
  )

  function removeAssignmentPrefix(assignment_uuid: string) {
    return assignment_uuid.replace('assignment_', '')
  }

  function removeCoursePrefix(course_uuid: string) {
    return course_uuid.replace('course_', '')
  }

  React.useEffect(() => {
    if (courses) {
      const course_uuids = courses.map((course: any) => course.course_uuid)
      const courseAssignmentsPromises = course_uuids.map(
        (course_uuid: string) => getAvailableAssignmentsForCourse(course_uuid)
      )
      Promise.all(courseAssignmentsPromises).then((results) => {
        setCourseAssignments(results)
      })
    }
  }, [courses, getAvailableAssignmentsForCourse])

  return (
    <div className="flex w-full min-w-0">
      <div className="flex w-full min-w-0 flex-col space-y-5 px-4 tracking-tighter sm:px-10 mb-8 md:mb-0">
        <div className="flex flex-col space-y-2">
          <BreadCrumbs type="assignments" />
          <h1 className="flex pt-3 text-3xl font-bold sm:text-4xl">
            {t('dashboard.assignments.home.title')}
          </h1>
        </div>
        <div className="flex flex-col space-y-3 w-full">
          {courseAssignments.map((assignments: any, index: number) => (
            <div
              key={index}
              className="flex flex-col space-y-2 bg-white nice-shadow p-3 sm:p-4 rounded-xl w-full"
            >
              <div>
                <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center space-x-2">
                    <MiniThumbnail course={courses[index]} />
                    <div className="flex min-w-0 flex-col text-lg font-bold">
                      <p className="bg-gray-200 text-gray-700 px-2 text-xs py-0.5 rounded-full w-fit">
                        {t('dashboard.assignments.home.course_label')}
                      </p>
                      <p className="min-w-0 truncate">{courses[index].name}</p>
                    </div>
                  </div>
                  <Link
                    href={{
                      pathname: getUriWithOrg(
                        org.slug,
                        `/dash/courses/course/${removeCoursePrefix(courses[index].course_uuid)}/content`
                      ),
                      query: { subpage: 'editor' },
                    }}
                    prefetch
                    className="flex min-h-10 w-full items-center justify-center space-x-1.5 rounded-md bg-black px-3 py-1 text-sm font-semibold text-zinc-100 nice-shadow sm:w-auto"
                  >
                    <GalleryVerticalEnd size={15} />
                    <p>{t('dashboard.assignments.home.course_editor')}</p>
                  </Link>
                </div>

                {assignments &&
                  assignments.map((assignment: any) => (
                    <div
                      key={assignment.assignment_uuid}
                      className="mt-3 flex w-full flex-col items-start justify-between gap-3 rounded bg-gray-50 p-2 light-shadow sm:p-3 lg:flex-row lg:items-center"
                    >
                      <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex h-fit rounded-full bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
                          <p>
                            {t('dashboard.assignments.home.assignment_label')}
                          </p>
                        </div>
                        <div className="min-w-0 text-lg font-semibold">
                          {assignment.title}
                        </div>
                        <div className="max-w-full truncate rounded px-2 py-0.5 font-semibold text-gray-600 outline outline-gray-200/70 sm:max-w-[320px] xl:max-w-[520px]">
                          {assignment.description}
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 text-sm font-bold sm:flex-row sm:items-center lg:w-auto">
                        <EllipsisVertical
                          className="hidden text-gray-500 lg:block"
                          size={17}
                        />
                        <Link
                          href={{
                            pathname: getUriWithOrg(
                              org.slug,
                              `/dash/assignments/${removeAssignmentPrefix(assignment.assignment_uuid)}`
                            ),
                            query: { subpage: 'editor' },
                          }}
                          prefetch
                          className="flex min-h-10 w-full items-center justify-center space-x-2 rounded-full bg-white px-3 py-1.5 nice-shadow sm:w-auto"
                        >
                          <Layers2 size={15} />
                          <p>{t('dashboard.assignments.home.editor')}</p>
                        </Link>
                        <Link
                          href={{
                            pathname: getUriWithOrg(
                              org.slug,
                              `/dash/assignments/${removeAssignmentPrefix(assignment.assignment_uuid)}`
                            ),
                            query: { subpage: 'submissions' },
                          }}
                          prefetch
                          className="flex min-h-10 w-full items-center justify-center space-x-2 rounded-full bg-white px-3 py-1.5 nice-shadow sm:w-auto"
                        >
                          <UserRoundPen size={15} />
                          <p>{t('dashboard.assignments.home.submissions')}</p>
                        </Link>
                      </div>
                    </div>
                  ))}

                {assignments.length === 0 && (
                  <>
                    <div className="flex mx-auto space-x-2 font-semibold mt-3 text-gray-600 items-center">
                      <Info size={20} />
                      <p>{t('dashboard.assignments.home.no_assignments')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const MiniThumbnail = (props: { course: any }) => {
  const org = useOrg() as any

  // function to remove "course_" from the course_uuid
  function removeCoursePrefix(course_uuid: string) {
    return course_uuid.replace('course_', '')
  }

  return (
    <Link
      href={getUriWithOrg(
        org.orgslug,
        '/course/' + removeCoursePrefix(props.course.course_uuid)
      )}
    >
      {props.course.thumbnail_image ? (
        <div
          className="inset-0 ring-1 ring-inset ring-black/10 rounded-lg shadow-xl w-[70px] h-[40px]   bg-cover"
          style={{
            backgroundImage: `url(${getCourseThumbnailMediaDirectory(
              org?.org_uuid,
              props.course.course_uuid,
              props.course.thumbnail_image
            )})`,
          }}
        />
      ) : (
        <div
          className="inset-0 ring-1 ring-inset ring-black/10 rounded-lg shadow-xl w-[70px] h-[40px] bg-cover"
          style={{
            backgroundImage: `url('../empty_thumbnail.png')`,
            backgroundSize: 'contain',
          }}
        />
      )}
    </Link>
  )
}

export default AssignmentsHome
