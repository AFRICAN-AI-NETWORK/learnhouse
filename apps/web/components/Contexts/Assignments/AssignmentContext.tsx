'use client'
import React, { createContext, useContext, useMemo } from 'react'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'

export const AssignmentContext = createContext({})

export function AssignmentProvider({
  children,
  assignment_uuid,
}: {
  children: React.ReactNode
  assignment_uuid: string
}) {
  const session = useLHSession() as any
  const accessToken = session?.data?.tokens?.access_token

  const { data: assignment } = useSWR(
    `${getAPIUrl()}assignments/${assignment_uuid}`,
    (url) => swrFetcher(url, accessToken)
  )

  const { data: assignment_tasks } = useSWR(
    `${getAPIUrl()}assignments/${assignment_uuid}/tasks`,
    (url) => swrFetcher(url, accessToken)
  )

  const course_id = assignment?.course_id

  const { data: course_object } = useSWR(
    course_id ? `${getAPIUrl()}courses/id/${course_id}` : null,
    (url) => swrFetcher(url, accessToken)
  )

  const activity_id = assignment?.activity_id

  const { data: activity_object } = useSWR(
    activity_id ? `${getAPIUrl()}activities/id/${activity_id}` : null,
    (url) => swrFetcher(url, accessToken)
  )

  const assignmentsFull = useMemo(() => {
    if (
      assignment &&
      assignment_tasks &&
      (!course_id || course_object) &&
      (!activity_id || activity_object)
    ) {
      return {
        assignment_object: assignment,
        assignment_tasks: assignment_tasks,
        course_object: course_object,
        activity_object: activity_object,
      }
    }
    return {}
  }, [
    assignment,
    assignment_tasks,
    course_object,
    activity_object,
    course_id,
    activity_id,
  ])

  return (
    <AssignmentContext.Provider value={assignmentsFull}>
      {children}
    </AssignmentContext.Provider>
  )
}

export function useAssignments() {
  return useContext(AssignmentContext)
}
