import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  errorHandling,
} from '../utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

export const registerForLiveSession = async (
  activityUuid: string,
  token: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}live_sessions/${activityUuid}/register`,
    RequestBodyWithAuthHeader('POST', null, null, token)
  )
  return await errorHandling(result)
}

export const getLiveParticipants = async (
  activityUuid: string,
  token?: string
) => {
  return swrFetcher(
    `${getAPIUrl()}live_sessions/${activityUuid}/participants`,
    token
  )
}

export const checkLiveRegistration = async (
  activityUuid: string,
  token?: string
) => {
  return swrFetcher(
    `${getAPIUrl()}live_sessions/${activityUuid}/is_registered`,
    token
  )
}

export const notifyParticipants = async (
  activityUuid: string,
  userIds: number[],
  type: 'CONFIRMATION' | 'REMINDER' | 'ENROLMENT',
  token: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}live_sessions/${activityUuid}/notify`,
    RequestBodyWithAuthHeader(
      'POST',
      { user_ids: userIds, notification_type: type },
      null,
      token
    )
  )
  return await errorHandling(result)
}

export const muteParticipant = async (
  activityUuid: string,
  participantId: string,
  token: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}live_sessions/${activityUuid}/participants/${participantId}/mute`,
    RequestBodyWithAuthHeader('POST', null, null, token)
  )
  return await errorHandling(result)
}

export const kickParticipant = async (
  activityUuid: string,
  participantId: string,
  token: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}live_sessions/${activityUuid}/participants/${participantId}/kick`,
    RequestBodyWithAuthHeader('DELETE', null, null, token)
  )
  return await errorHandling(result)
}
