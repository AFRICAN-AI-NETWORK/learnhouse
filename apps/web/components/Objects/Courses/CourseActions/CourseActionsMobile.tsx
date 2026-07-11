import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  getUriWithoutOrg,
  getUriWithOrg,
  getAPIUrl,
} from '@services/config/config'
import { getProductsByCourse } from '@services/payments/products'
import {
  LogIn,
  LogOut,
  ShoppingCart,
  AlertCircle,
  BookOpen,
} from 'lucide-react'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import CoursePaidOptions from './CoursePaidOptions'
import { checkPaidAccess } from '@services/payments/payments'
import { removeCourse, startCourse } from '@services/courses/activity'
import { revalidateTags, swrFetcher } from '@services/utils/ts/requests'
import UserAvatar from '../../UserAvatar'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import useSWR from 'swr'

interface Author {
  user: {
    user_uuid: string
    avatar_image: string
    first_name: string
    last_name: string
    username: string
  }
  authorship: 'CREATOR' | 'CONTRIBUTOR' | 'MAINTAINER' | 'REPORTER'
  authorship_status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
}

interface CourseRun {
  status: string
  course_id: string
}

interface Course {
  id: string
  course_uuid: string
  authors: Author[]
  trail?: {
    runs: CourseRun[]
  }
  chapters?: Array<{
    name: string
    activities: Array<{
      activity_uuid: string
      name: string
      activity_type: string
    }>
  }>
}

interface CourseActionsMobileProps {
  courseuuid: string
  orgslug: string
  course: Course & {
    org_id: number
  }
  trailData?: any
}

// Component for displaying multiple authors
const MultipleAuthors = ({ authors }: { authors: Author[] }) => {
  const displayedAvatars = authors.slice(0, 3)
  const remainingCount = Math.max(0, authors.length - 3)

  // Avatar size for mobile
  const avatarSize = 36
  const borderSize = 'border-2'

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3 relative">
        {displayedAvatars.map((author, index) => (
          <div
            key={author.user.user_uuid}
            className="relative"
            style={{ zIndex: displayedAvatars.length - index }}
          >
            <UserAvatar
              border={borderSize}
              rounded="rounded-full"
              avatar_url={
                author.user.avatar_image
                  ? getUserAvatarMediaDirectory(
                      author.user.user_uuid,
                      author.user.avatar_image
                    )
                  : ''
              }
              predefined_avatar={author.user.avatar_image ? undefined : 'empty'}
              width={avatarSize}
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="relative" style={{ zIndex: 0 }}>
            <div
              className="flex items-center justify-center bg-neutral-100 text-neutral-600 font-medium rounded-full border-2 border-white shadow-sm"
              style={{
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                fontSize: '12px',
              }}
            >
              +{remainingCount}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-xs text-neutral-400 font-medium">
          {authors.length > 1 ? 'Authors' : 'Author'}
        </span>
        {authors.length === 1 ? (
          <span className="text-sm font-semibold text-neutral-800">
            {authors[0].user.first_name && authors[0].user.last_name
              ? `${authors[0].user.first_name} ${authors[0].user.last_name}`
              : `@${authors[0].user.username}`}
          </span>
        ) : (
          <span className="text-sm font-semibold text-neutral-800">
            {authors[0].user.first_name && authors[0].user.last_name
              ? `${authors[0].user.first_name} ${authors[0].user.last_name}`
              : `@${authors[0].user.username}`}
            {authors.length > 1 && ` & ${authors.length - 1} more`}
          </span>
        )}
      </div>
    </div>
  )
}

const CourseActionsMobile = ({
  courseuuid,
  orgslug,
  course,
  trailData,
}: CourseActionsMobileProps) => {
  const router = useRouter()
  const session = useLHSession() as any
  const [linkedProducts, setLinkedProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [accessReason, setAccessReason] = useState<string | null>(null)

  const cleanCourseUuid = course.course_uuid?.replace('course_', '')

  const { data: prerequisites } = useSWR<any[]>(
    `${getAPIUrl()}prerequisites/course_${courseuuid}`,
    (url: string) =>
      swrFetcher(url, session.data?.tokens?.access_token || undefined)
  )

  const missingPrerequisites = React.useMemo(() => {
    if (accessReason === 'ADMIN' || accessReason === 'AUTHOR') return []
    if (!prerequisites || !trailData?.runs) return []
    return prerequisites.filter((prereq: any) => {
      const run = trailData.runs.find(
        (r: any) => r.course_id === prereq.prerequisite_course_id
      )
      return !run || run.status !== 'STATUS_COMPLETED'
    })
  }, [prerequisites, trailData, accessReason])

  const isStarted =
    trailData?.runs?.find((run: any) => {
      const cleanRunCourseUuid = run.course?.course_uuid?.replace('course_', '')
      return cleanRunCourseUuid === cleanCourseUuid
    }) ?? false

  useEffect(() => {
    const fetchLinkedProducts = async () => {
      try {
        const response = await getProductsByCourse(
          course.org_id,
          course.id,
          session.data?.tokens?.access_token
        )
        setLinkedProducts(response.data || [])
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch linked products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLinkedProducts()
  }, [course.id, course.org_id, session.data?.tokens?.access_token])

  useEffect(() => {
    const checkAccess = async () => {
      if (!session.data?.user) return
      try {
        const response = await checkPaidAccess(
          parseInt(course.id),
          course.org_id,
          session.data?.tokens?.access_token
        )
        setHasAccess(response.has_access)

        if (response.has_access) {
          if (response.diagnostics?.is_admin) {
            setAccessReason('ADMIN')
          } else if (response.diagnostics?.is_author) {
            setAccessReason('AUTHOR')
          } else if (
            response.diagnostics?.user_has_payment &&
            response.diagnostics?.payment_status === 'COMPLETED'
          ) {
            setAccessReason('PURCHASED')
          } else if (!response.diagnostics?.course_linked_to_product) {
            setAccessReason('FREE')
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to check course access')
        setHasAccess(false)
      }
    }

    if (linkedProducts.length > 0) {
      checkAccess()
    }
  }, [
    course.id,
    course.org_id,
    session.data?.tokens?.access_token,
    session.data?.user,
    linkedProducts,
  ])

  const handleCourseAction = async () => {
    if (!session.data?.user) {
      router.push(getUriWithoutOrg(`/signup?orgslug=${orgslug}`))
      return
    }

    setIsActionLoading(true)
    try {
      if (isStarted) {
        const result = await removeCourse(
          'course_' + courseuuid,
          orgslug,
          session.data?.tokens?.access_token
        )
        if (!result.success) {
          // eslint-disable-next-line no-console
          console.error('Failed to leave course:', result.error)
          return
        }
        await revalidateTags(['courses'], orgslug)
        router.refresh()
      } else {
        const result = await startCourse(
          'course_' + courseuuid,
          orgslug,
          session.data?.tokens?.access_token
        )
        if (!result.success) {
          // eslint-disable-next-line no-console
          console.error('Failed to start course:', result.error)
          return
        }
        await revalidateTags(['courses'], orgslug)

        // Get the first activity from the first chapter
        const firstChapter = course.chapters?.[0]
        const firstActivity = firstChapter?.activities?.[0]

        if (firstActivity) {
          // Redirect to the first activity
          await revalidateTags(['activities'], orgslug)
          router.push(
            getUriWithOrg(orgslug, '') +
              `/course/${courseuuid}/activity/${firstActivity.activity_uuid.replace('activity_', '')}`
          )
        } else {
          router.refresh()
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to perform course action:', error)
    } finally {
      setIsActionLoading(false)
      await revalidateTags(['courses'], orgslug)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse h-16 bg-gray-100 rounded-lg mt-4 mb-8" />
    )
  }

  // Filter active authors and sort by role priority
  const sortedAuthors = [...course.authors]
    .filter((author) => author.authorship_status === 'ACTIVE')
    .sort((a, b) => {
      const rolePriority: Record<string, number> = {
        CREATOR: 0,
        MAINTAINER: 1,
        CONTRIBUTOR: 2,
        REPORTER: 3,
      }
      return rolePriority[a.authorship] - rolePriority[b.authorship]
    })

  return (
    <div className="bg-white/90 backdrop-blur-sm shadow-md shadow-gray-300/25 outline-1 outline-neutral-200/40 rounded-lg overflow-hidden p-4 my-6 mx-2">
      <div className="flex flex-col space-y-4">
        <MultipleAuthors authors={sortedAuthors} />

        {linkedProducts.length > 0 ? (
          <div className="space-y-3">
            {hasAccess ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-800 text-sm font-semibold">
                    You Own This Course
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-800" />
                  <span className="text-amber-800 text-sm font-semibold">
                    Paid Course
                  </span>
                </div>
              </div>
            )}

            {hasAccess ? (
              <>
                {!isStarted && missingPrerequisites.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg mb-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-rose-900 text-xs font-semibold block">
                          Prerequisites Required
                        </span>
                        <ul className="list-disc list-inside text-rose-800 text-[10px] mt-1 space-y-1">
                          {missingPrerequisites.map((prereq: any) => (
                            <li key={prereq.id}>
                              <Link
                                href={getUriWithOrg(
                                  orgslug,
                                  `/course/${prereq.prerequisite_course_uuid.replace('course_', '')}`
                                )}
                                className="underline hover:text-rose-950"
                              >
                                {prereq.prerequisite_course_name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCourseAction}
                  disabled={
                    isActionLoading ||
                    (!isStarted && missingPrerequisites.length > 0)
                  }
                  className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                    isStarted
                      ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-400'
                      : !isStarted && missingPrerequisites.length > 0
                        ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-700'
                  }`}
                >
                  {isActionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isStarted ? (
                    <>
                      <LogOut className="w-4 h-4" />
                      Leave Course
                    </>
                  ) : !isStarted && missingPrerequisites.length > 0 ? (
                    <>
                      <BookOpen className="w-4 h-4 text-neutral-400" />
                      Start Course (Locked)
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Start Course
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <Modal
                  isDialogOpen={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  dialogContent={<CoursePaidOptions course={course} />}
                  dialogTitle="Purchase Course"
                  dialogDescription="Select a payment option to access this course"
                  minWidth="sm"
                />
                <button
                  onClick={() => {
                    const product = linkedProducts[0]
                    if (product && product.name) {
                      const name = product.name.toLowerCase()
                      let path = ''
                      if (name.includes('content creators')) {
                        path = `/orgs/${orgslug}/ai-automation-content-creators`
                      } else if (name.includes('business')) {
                        path = `/orgs/${orgslug}/ai-automation`
                      } else if (name.includes('fundamental') || name.includes('foundations')) {
                        path = `/orgs/${orgslug}/ai-fundamentals`
                      }

                      if (path) {
                        router.push(path)
                      } else {
                        setIsModalOpen(true)
                      }
                    } else {
                      setIsModalOpen(true)
                    }
                  }}
                  disabled={isActionLoading}
                  className="w-full py-2 px-4 rounded-lg bg-neutral-900 text-white font-semibold text-sm hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 disabled:bg-neutral-700"
                >
                  {isActionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Purchase Course
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {!isStarted && missingPrerequisites.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg mb-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-rose-900 text-xs font-semibold block">
                      Prerequisites Required
                    </span>
                    <ul className="list-disc list-inside text-rose-800 text-[10px] mt-1 space-y-1">
                      {missingPrerequisites.map((prereq: any) => (
                        <li key={prereq.id}>
                          <Link
                            href={getUriWithOrg(
                              orgslug,
                              `/course/${prereq.prerequisite_course_uuid.replace('course_', '')}`
                            )}
                            className="underline hover:text-rose-950"
                          >
                            {prereq.prerequisite_course_name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleCourseAction}
              disabled={
                isActionLoading ||
                (!isStarted && missingPrerequisites.length > 0)
              }
              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                isStarted
                  ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-400'
                  : !isStarted && missingPrerequisites.length > 0
                    ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-700'
              }`}
            >
              {isActionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : !session.data?.user ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : isStarted ? (
                <>
                  <LogOut className="w-4 h-4" />
                  Leave Course
                </>
              ) : !isStarted && missingPrerequisites.length > 0 ? (
                <>
                  <BookOpen className="w-4 h-4 text-neutral-400" />
                  Start Course (Locked)
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Start Course
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default CourseActionsMobile
