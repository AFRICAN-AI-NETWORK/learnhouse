import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  errorHandling,
} from './utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

export interface Announcement {
  id: number
  org_id: number
  title: string
  content: string
  is_active: boolean
  created_by_user_id: number
  creation_date: string
  update_date: string
  is_read?: boolean
}

export const fetchAnnouncements = async (
  orgslug: string,
  activeOnly: boolean = true,
  token?: string
): Promise<Announcement[]> => {
  return swrFetcher(
    `${getAPIUrl()}announcements/${orgslug}?active_only=${activeOnly}`,
    token
  )
}

export const createAnnouncement = async (
  orgslug: string,
  title: string,
  content: string,
  token?: string,
  isActive: boolean = true
): Promise<Announcement> => {
  const result: any = await fetch(
    `${getAPIUrl()}announcements/${orgslug}`,
    RequestBodyWithAuthHeader(
      'POST',
      { title, content, is_active: isActive },
      null,
      token
    )
  )
  return await errorHandling(result)
}

export const updateAnnouncement = async (
  orgslug: string,
  announcementId: number,
  token?: string,
  title?: string,
  content?: string,
  isActive?: boolean
): Promise<Announcement> => {
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (content !== undefined) updateData.content = content
  if (isActive !== undefined) updateData.is_active = isActive

  const result: any = await fetch(
    `${getAPIUrl()}announcements/${orgslug}/${announcementId}`,
    RequestBodyWithAuthHeader('PUT', updateData, null, token)
  )
  return await errorHandling(result)
}

export const markAnnouncementRead = async (
  orgslug: string,
  announcementId: number,
  token?: string
): Promise<void> => {
  const result: any = await fetch(
    `${getAPIUrl()}announcements/${orgslug}/${announcementId}/read`,
    RequestBodyWithAuthHeader('POST', {}, null, token)
  )
  return await errorHandling(result)
}
