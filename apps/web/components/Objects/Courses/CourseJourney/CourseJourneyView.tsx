'use client'

import React, { useMemo } from 'react'
import { getAPIUrl } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { swrFetcher } from '@services/utils/ts/requests'
import useSWR from 'swr'
import CourseJourneyPanel from './CourseJourneyPanel'

type CourseChapter = {
  id: number
  name: string
  activities?: { id: number }[]
}

function CourseJourneyView({
  courseUuid,
  orgslug,
  chapters,
}: {
  courseUuid: string
  orgslug: string
  chapters: CourseChapter[]
}) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token
  const { data: trailData } = useSWR(
    org?.id ? `${getAPIUrl()}trail/org/${org.id}/trail` : null,
    (url) => swrFetcher(url, accessToken)
  )
  const cleanCourseUuid = courseUuid.replace('course_', '')
  const currentRun = useMemo(
    () =>
      trailData?.runs?.find((run: any) => {
        const runCourseUuid = run.course?.course_uuid?.replace('course_', '')
        return runCourseUuid === cleanCourseUuid
      }),
    [cleanCourseUuid, trailData?.runs]
  )

  return (
    <CourseJourneyPanel
      courseUuid={courseUuid}
      orgslug={orgslug}
      chapters={chapters}
      completedActivityIds={
        currentRun?.steps?.map((step: any) => step.activity_id) || []
      }
      fullPage
    />
  )
}

export default CourseJourneyView
