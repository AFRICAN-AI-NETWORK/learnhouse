import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  errorHandling,
} from '../utils/ts/requests'
import { getAPIUrl } from '@services/config/config'
import { Notification } from '@/types/notifications'

/**
 * Shared SWR key for the notification feed, so a push received on the
 * WebSocket (see GlobalChatContext) can revalidate every mounted
 * NotificationBell via SWR's global `mutate(key)` without prop-drilling.
 */
export const NOTIFICATIONS_SWR_KEY = (token: string) =>
  ['notifications_feed', token] as const

export const getNotifications = async (
  token?: string,
  page: number = 1,
  limit: number = 20
): Promise<Notification[]> => {
  return swrFetcher(
    `${getAPIUrl()}notifications/?page=${page}&limit=${limit}`,
    token
  )
}

export const getUnreadNotificationCount = async (
  token?: string
): Promise<number> => {
  const data = await swrFetcher(
    `${getAPIUrl()}notifications/unread-count`,
    token
  )
  return data?.unread_count ?? 0
}

export const markNotificationAsRead = async (
  notificationId: number,
  token?: string
): Promise<Notification> => {
  const result: any = await fetch(
    `${getAPIUrl()}notifications/${notificationId}/read`,
    RequestBodyWithAuthHeader('POST', {}, null, token)
  )
  return await errorHandling(result)
}

export const markAllNotificationsAsRead = async (
  token?: string
): Promise<{ marked_read: number }> => {
  const result: any = await fetch(
    `${getAPIUrl()}notifications/read-all`,
    RequestBodyWithAuthHeader('POST', {}, null, token)
  )
  return await errorHandling(result)
}

export const deleteNotification = async (
  notificationId: number,
  token?: string
): Promise<void> => {
  const result: any = await fetch(
    `${getAPIUrl()}notifications/${notificationId}`,
    RequestBodyWithAuthHeader('DELETE', null, null, token)
  )
  return await errorHandling(result)
}
