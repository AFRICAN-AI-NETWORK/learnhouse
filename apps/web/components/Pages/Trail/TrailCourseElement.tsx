'use client'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { removeCourse } from '@services/courses/activity'
import { getCourseThumbnailMediaDirectory } from '@services/media/media'
import { revalidateTags } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUserCertificates } from '@services/courses/certifications'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { mutate } from 'swr'
import { Award, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TrailCourseElementProps {
  course: any
  run: any
  orgslug: string
}

function TrailCourseElement(props: TrailCourseElementProps) {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const courseid = props.course.course_uuid.replace('course_', '')
  const course = props.course
  const router = useRouter()
  const course_total_steps = props.run.course_total_steps
  const course_completed_steps = props.run.steps.filter(
    (step: any) => step.complete === true
  ).length
  const orgID = org?.id
  const course_progress =
    course_total_steps > 0
      ? Math.round((course_completed_steps / course_total_steps) * 100)
      : 0

  const [courseCertificate, setCourseCertificate] = useState<any>(null)
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false)

  async function quitCourse(course_uuid: string) {
    // Close activity
    let activity = await removeCourse(course_uuid, props.orgslug, access_token)
    // Mutate course
    await revalidateTags(['courses'], props.orgslug)
    router.refresh()

    // Mutate
    mutate(`${getAPIUrl()}trail/org/${orgID}/trail`)
  }

  // Fetch certificate for this course
  useEffect(() => {
    const fetchCourseCertificate = async () => {
      if (!access_token || course_progress < 100) return

      setIsLoadingCertificate(true)
      try {
        const result = await getUserCertificates(
          props.course.course_uuid,
          access_token
        )

        if (result.success && result.data && result.data.length > 0) {
          setCourseCertificate(result.data[0])
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching course certificate:', error)
      } finally {
        setIsLoadingCertificate(false)
      }
    }

    fetchCourseCertificate()
  }, [access_token, course_progress, props.course.course_uuid])

  useEffect(() => {}, [props.course, org])

  return (
    <div
      className="trailcoursebox flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-start sm:gap-0"
      style={{ boxShadow: '0px 4px 7px 0px rgba(0, 0, 0, 0.03)' }}
    >
      <Link
        href={getUriWithOrg(props.orgslug, '/course/' + courseid)}
        className="shrink-0"
      >
        <div
          className="course_tumbnail inset-0 relative h-36 w-full rounded-lg bg-cover bg-center ring-1 ring-inset ring-black/10 sm:h-[50px] sm:w-[72px]"
          style={{
            backgroundImage: `url(${getCourseThumbnailMediaDirectory(
              org.org_uuid,
              props.course.course_uuid,
              props.course.thumbnail_image
            )})`,
            boxShadow: '0px 4px 7px 0px rgba(0, 0, 0, 0.03)',
          }}
        ></div>
      </Link>
      <div className="course_meta min-w-0 grow space-y-2 sm:pl-5">
        <div className="course_top">
          <div className="course_info flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="course_basic flex min-w-0 flex-col sm:-space-y-2">
              <p className="p-0 font-bold text-sm text-gray-700">
                {t('search.course')}
              </p>
              <div className="course_progress flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <h2 className="min-w-0 break-words text-lg font-bold leading-snug sm:text-xl">
                  {course.name}
                </h2>
                <div className="hidden h-[5px] w-[10px] rounded-full bg-slate-300 sm:block"></div>
                <h2 className="text-sm font-semibold text-gray-500 sm:text-base sm:text-gray-900">
                  {course_progress}%
                </h2>
              </div>
            </div>
            <div className="course_actions flex shrink-0 sm:grow sm:flex-row-reverse">
              <button
                onClick={() => quitCourse(course.course_uuid)}
                className="h-8 rounded-full bg-red-100 px-3 text-xs font-bold text-red-700 hover:bg-red-200 sm:h-5 sm:px-2"
              >
                {t('courses.quit_course')}
              </button>
            </div>
          </div>
        </div>
        <div className="course_progress indicator w-full">
          <div className="w-full bg-gray-200 rounded-full h-1.5 ">
            <div
              className={`bg-teal-600 h-1.5 rounded-full`}
              style={{ width: `${course_progress}%` }}
            ></div>
          </div>
        </div>

        {/* Certificate Section */}
        {course_progress === 100 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            {isLoadingCertificate ? (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-500"></div>
                <span>{t('common.loading')}</span>
              </div>
            ) : courseCertificate ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center space-x-1">
                  <Award className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {t('certificate.certificate')}
                  </span>
                </div>
                <Link
                  href={getUriWithOrg(
                    props.orgslug,
                    `/certificates/${courseCertificate.certificate_user.user_certification_uuid}/verify`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <span>{t('certificate.verify')}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Award className="w-3 h-3 text-gray-300" />
                <span>{t('certificate.no_certificate')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default TrailCourseElement
