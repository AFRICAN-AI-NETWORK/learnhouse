import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  errorHandling,
  getResponseMetadata,
} from '@services/utils/ts/requests'

export type JourneyPhase =
  | 'onboarding'
  | 'core_learning'
  | 'capstone'
  | 'alumni'

export type MilestoneCriteria =
  | 'manual'
  | 'course_started'
  | 'chapter_completed'
  | 'course_grade_at_least'
  | 'required_assignments_graded'
  | 'certificate_issued'

export type MilestoneStatus =
  | 'not_started'
  | 'in_progress'
  | 'achieved'
  | 'at_risk'

export type StudentJourneyMilestone = {
  milestone_uuid: string
  course_uuid: string
  phase: JourneyPhase
  name: string
  description?: string | null
  sequence_order: number
  criteria: MilestoneCriteria
  criteria_config: Record<string, any>
  creation_date?: string
  update_date?: string
}

export type StudentMilestoneStatus = {
  milestone_uuid: string
  phase: JourneyPhase
  name: string
  description?: string | null
  sequence_order: number
  criteria: MilestoneCriteria
  status: MilestoneStatus
  achieved_at?: string | null
  is_manual_override: boolean
  notes?: string | null
}

export type MilestoneInput = {
  phase: JourneyPhase
  name: string
  description?: string | null
  sequence_order: number
  criteria: MilestoneCriteria
  criteria_config: Record<string, any>
}

export type MilestoneProgressInput = {
  status: MilestoneStatus | null
  notes?: string | null
}

const api = () => getAPIUrl()

export async function seedCourseJourney(
  course_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}student-journey/course/${course_uuid}/seed`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getCourseMilestones(
  course_uuid: string,
  access_token?: string
): Promise<StudentJourneyMilestone[]> {
  const result = await fetch(
    `${api()}student-journey/course/${course_uuid}/milestones`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function createCourseMilestone(
  course_uuid: string,
  body: MilestoneInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}student-journey/course/${course_uuid}/milestones`,
    RequestBodyWithAuthHeader('POST', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function deleteCourseMilestone(
  milestone_uuid: string,
  access_token?: string
) {
  const result = await fetch(
    `${api()}student-journey/milestones/${milestone_uuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function updateCourseMilestone(
  milestone_uuid: string,
  body: Partial<MilestoneInput>,
  access_token?: string
) {
  const result = await fetch(
    `${api()}student-journey/milestones/${milestone_uuid}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}

export async function getMyCourseJourney(
  course_uuid: string,
  access_token?: string
): Promise<StudentMilestoneStatus[]> {
  const result = await fetch(
    `${api()}student-journey/course/${course_uuid}/me`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function getLearnerCourseJourney(
  course_uuid: string,
  user_id: number,
  access_token?: string
): Promise<StudentMilestoneStatus[]> {
  const result = await fetch(
    `${api()}student-journey/course/${course_uuid}/learners/${user_id}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  return await errorHandling(result)
}

export async function setMilestoneProgress(
  milestone_uuid: string,
  user_id: number,
  body: MilestoneProgressInput,
  access_token?: string
) {
  const result = await fetch(
    `${api()}student-journey/milestones/${milestone_uuid}/progress/${user_id}`,
    RequestBodyWithAuthHeader('PUT', body, null, access_token)
  )
  return await getResponseMetadata(result)
}
