'use client'
import React, { createContext, useContext } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'

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
  const assignmentsFull = React.useMemo(() => {
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
    return {
      assignment_object: null,
      assignment_tasks: null,
      course_object: null,
      activity_object: null,
    }
  }, [
    assignment,
    assignment_tasks,
    course_object,
    activity_object,
    course_id,
    activity_id,
  ])

  if (
    assignmentError ||
    assignmentTasksError ||
    courseObjectError ||
    activityObjectError
  )
    return <div></div>

  if (
    !assignment ||
    !assignment_tasks ||
    (course_id && !course_object) ||
    (activity_id && !activity_object)
  )
    return <div></div>

  return (
    <AssignmentContext.Provider value={assignmentsFull}>
      {children}
    </AssignmentContext.Provider>
  )
}

export function useAssignments() {
  return useContext(AssignmentContext)
}
