import React from 'react'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { nextAuthOptions } from 'app/auth/options'
import GeneralWrapperStyled from '@components/Objects/StyledElements/Wrappers/GeneralWrapper'
import CourseJourneyView from '@components/Objects/Courses/CourseJourney/CourseJourneyView'
import { getCourseMetadata } from '@services/courses/courses'

const CourseJourneyPage = async ({
  params,
}: {
  params: Promise<{ orgslug: string; courseuuid: string }>
}) => {
  const { orgslug, courseuuid } = await params
  const session = await getServerSession(nextAuthOptions)

  let course
  try {
    course = await getCourseMetadata(
      courseuuid,
      { revalidate: 0, tags: ['courses'] },
      session?.tokens?.access_token
    )
  } catch {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <GeneralWrapperStyled>
        <div className="space-y-5 py-6">
          <div>
            <p className="text-sm font-semibold text-blue-700">{course.name}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">
              Course journey
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Weekly topics, milestone expectations, and your completion.
            </p>
          </div>
          <CourseJourneyView
            courseUuid={course.course_uuid}
            orgslug={orgslug}
            chapters={course.chapters || []}
          />
        </div>
      </GeneralWrapperStyled>
    </main>
  )
}

export default CourseJourneyPage
