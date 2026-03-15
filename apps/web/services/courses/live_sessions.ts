import { request } from '../utils/ts/requests'

export const registerForLiveSession = async (activityUuid: string) => {
  return request({
    url: `/live_sessions/${activityUuid}/register`,
    method: 'POST',
  })
}

export const getLiveParticipants = async (activityUuid: string) => {
  return request({
    url: `/live_sessions/${activityUuid}/participants`,
    method: 'GET',
  })
}

export const checkLiveRegistration = async (activityUuid: string) => {
  return request({
    url: `/live_sessions/${activityUuid}/is_registered`,
    method: 'GET',
  })
}

export const notifyParticipants = async (
  activityUuid: string,
  userIds: number[],
  type: 'CONFIRMATION' | 'REMINDER' | 'ENROLMENT'
) => {
  return request({
    url: `/live_sessions/${activityUuid}/notify`,
    method: 'POST',
    data: { user_ids: userIds, notification_type: type },
  })
}
