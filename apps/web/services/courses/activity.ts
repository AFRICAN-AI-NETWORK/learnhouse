'use server'

import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

/*
 This file includes only POST, PUT, DELETE requests
 GET requests are called from the frontend using SWR (https://swr.vercel.app/)
*/

// Server Action safe result type — errors cannot be thrown across the
// server→client boundary, so we return a plain object instead.
type ActionResult = {
  success: boolean
  data?: any
  error?: string
  status?: number
}

async function handleResponse(result: Response): Promise<ActionResult> {
  if (!result.ok) {
    let detail = ''
    try {
      const body = await result.json()
      detail = body?.detail || body?.message || result.statusText
    } catch {
      try {
        detail = await result.text()
      } catch {
        detail = result.statusText
      }
    }
    // eslint-disable-next-line no-console
    console.error(`[activity] API Error ${result.status}: ${detail}`)
    return { success: false, error: detail, status: result.status }
  }
  const text = await result.text()
  try {
    return { success: true, data: text ? JSON.parse(text) : {} }
  } catch {
    return { success: true, data: {} }
  }
}

export async function startCourse(
  course_uuid: string,
  org_slug: string,
  access_token: any
): Promise<ActionResult> {
  const result = await fetch(
    `${getAPIUrl()}trail/add_course/${course_uuid}/`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  return handleResponse(result)
}

export async function removeCourse(
  course_uuid: string,
  org_slug: string,
  access_token: any
): Promise<ActionResult> {
  const result = await fetch(
    `${getAPIUrl()}trail/remove_course/${course_uuid}/`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return handleResponse(result)
}

export async function markActivityAsComplete(
  org_slug: string,
  course_uuid: string,
  activity_uuid: string,
  access_token: any
): Promise<ActionResult> {
  const result = await fetch(
    `${getAPIUrl()}trail/add_activity/${activity_uuid}/`,
    RequestBodyWithAuthHeader('POST', {}, null, access_token)
  )
  return handleResponse(result)
}

export async function unmarkActivityAsComplete(
  org_slug: string,
  course_uuid: string,
  activity_uuid: string,
  access_token: any
): Promise<ActionResult> {
  const result = await fetch(
    `${getAPIUrl()}trail/remove_activity/${activity_uuid}/`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  )
  return handleResponse(result)
}
