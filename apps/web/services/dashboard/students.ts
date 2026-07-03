import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  errorHandling,
} from '@services/utils/ts/requests'

export async function getStudents(
  orgId: number,
  access_token: string,
  search?: string,
  page: number = 1,
  pageSize: number = 25
) {
  let url = `${getAPIUrl()}admin/analytics/orgs/${orgId}/students?page=${page}&page_size=${pageSize}`
  if (search) {
    url += `&search=${encodeURIComponent(search)}`
  }
  const result = await fetch(
    url,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function getStudentDetail(
  orgId: number,
  userId: number,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}admin/analytics/orgs/${orgId}/students/${userId}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function getStudentCourseDetail(
  orgId: number,
  userId: number,
  courseId: number,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}admin/analytics/orgs/${orgId}/students/${userId}/courses/${courseId}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function getOrgAnalyticsSummary(
  orgId: number,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}admin/analytics/orgs/${orgId}/analytics/summary`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}

export async function sendActivityHeartbeat(
  activity_uuid: string,
  seconds: number,
  access_token: string
) {
  const payload = {
    activity_uuid: activity_uuid,
    seconds: seconds,
  }
  const result = await fetch(
    `${getAPIUrl()}trail/heartbeat`,
    RequestBodyWithAuthHeader('POST', payload, null, access_token)
  )
  const res = await errorHandling(result)
  return res
}
