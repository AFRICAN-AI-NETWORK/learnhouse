'use server'
import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  getResponseMetadata,
} from '@services/utils/ts/requests'

export async function getWaitlistDetails(waitlistUuid: string) {
  const result = await fetch(`${getAPIUrl()}waitlist/config/${waitlistUuid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow',
  })
  const res = await getResponseMetadata(result)
  return res
}

export async function getWaitlistCourses(waitlistUuid: string) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/${waitlistUuid}/courses`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
    }
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function registerWaitlistUser(
  waitlistUuid: string,
  userData: any
): Promise<any> {
  const HeadersConfig = new Headers({ 'Content-Type': 'application/json' })

  const requestOptions: any = {
    method: 'POST',
    headers: HeadersConfig,
    body: JSON.stringify(userData),
    redirect: 'follow',
  }

  const res = await fetch(
    `${getAPIUrl()}waitlist/join?waitlist_uuid=${waitlistUuid}`,
    requestOptions
  )

  return res
}

// Admin endpoints
export async function createWaitlistConfig(
  configData: any,
  accessToken: string
) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config`,
    RequestBodyWithAuthHeader('POST', configData, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function updateWaitlistConfig(
  uuid: string,
  data: any,
  accessToken: string
) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/${uuid}`,
    RequestBodyWithAuthHeader('PUT', data, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function cancelWaitlistConfig(uuid: string, accessToken: string) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/${uuid}`,
    RequestBodyWithAuthHeader('DELETE', null, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getOrgWaitlists(orgId: number, accessToken: string) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/org/${orgId}`,
    RequestBodyWithAuthHeader('GET', null, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getWaitlistUsers(uuid: string, accessToken: string) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/${uuid}/users`,
    RequestBodyWithAuthHeader('GET', null, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}

export async function getWaitlistPreferences(
  uuid: string,
  accessToken: string
) {
  const result = await fetch(
    `${getAPIUrl()}waitlist/config/${uuid}/preferences`,
    RequestBodyWithAuthHeader('GET', null, null, accessToken)
  )
  const res = await getResponseMetadata(result)
  return res
}
