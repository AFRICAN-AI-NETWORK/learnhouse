'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getAPIUrl } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
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

  const [assignmentsFull, setAssignmentsFull] = useState<any>({
    assignment_object: null,
    assignment_tasks: null,
    course_object: null,
    activity_object: null,
  })

  const { data: assignment } = useSWR(
    assignment_uuid ? `${getAPIUrl()}assignments/${assignment_uuid}` : null,
    (url: string) => swrFetcher(url, accessToken)
  )

  const { data: assignment_tasks } = useSWR(
    assignment_uuid
      ? `${getAPIUrl()}assignments/${assignment_uuid}/tasks`
      : null,
    (url: string) => swrFetcher(url, accessToken)
  )

  const course_id = assignment?.course_uuid
  const activity_id = assignment?.activity_uuid

  const { data: course_object } = useSWR(
    course_id ? `${getAPIUrl()}courses/${course_id}` : null,
    (url: string) => swrFetcher(url, accessToken)
  )

  const { data: activity_object } = useSWR(
    activity_id ? `${getAPIUrl()}activities/${activity_id}` : null,
    (url: string) => swrFetcher(url, accessToken)
  )

  useEffect(() => {
    if (
      assignment &&
      assignment_tasks &&
      (!course_id || course_object) &&
      (!activity_id || activity_object)
    ) {
      setAssignmentsFull({
        assignment_object: assignment,
        assignment_tasks: assignment_tasks,
        course_object: course_object,
        activity_object: activity_object,
      })
    }
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
