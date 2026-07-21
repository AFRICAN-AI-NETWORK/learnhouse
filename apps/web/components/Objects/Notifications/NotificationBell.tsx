'use client'

import React, { useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import useSWR from 'swr'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  fetchAnnouncements,
  markAnnouncementRead,
  Announcement,
} from '@services/announcements'
import {
  getNotifications,
  markNotificationAsRead,
  NOTIFICATIONS_SWR_KEY,
} from '@services/notifications/notificationAPI'
import { Notification } from '@/types/notifications'
import { getNotificationIcon } from '@/utils/notification'

/**
 * One unified feed item, regardless of which backend it came from.
 * Announcements stay a separate backend/table
 * row per org member per announcement, which is heavier than announcements'
 * existing lazy, opt-in read-tracking. This bell is the only place the two
 * are unified, purely for display.
 */
type FeedItem =
  | {
      source: 'notification'
      id: number
      title: string
      body: string
      date: string
      isRead: boolean
      icon: ReturnType<typeof getNotificationIcon>
    }
  | {
      source: 'announcement'
      id: number
      title: string
      body: string
      date: string
      isRead: boolean
      icon: null
    }

const toNotificationFeedItem = (notification: Notification): FeedItem => ({
  source: 'notification',
  id: notification.id,
  title: notification.title,
  body: notification.message,
  date: notification.created_at,
  isRead: notification.is_read,
  icon: getNotificationIcon(notification.notification_type),
})

const toAnnouncementFeedItem = (announcement: Announcement): FeedItem => ({
  source: 'announcement',
  id: announcement.id,
  title: announcement.title,
  body: announcement.content,
  date: announcement.creation_date,
  isRead: !!announcement.is_read,
  icon: null,
})

export function NotificationBell({ orgslug }: { orgslug: string }) {
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''

  const [isOpen, setIsOpen] = useState(false)

  const { data: notifications = [], mutate: mutateNotifications } = useSWR(
    access_token ? NOTIFICATIONS_SWR_KEY(access_token) : null,
    ([, token]) => getNotifications(token as string)
  )

  const { data: announcements = [], mutate: mutateAnnouncements } = useSWR(
    orgslug && access_token
      ? [`${orgslug}_announcements_active`, access_token]
      : null,
    ([, token]) => fetchAnnouncements(orgslug, true, token as string)
  )

  const feed = useMemo<FeedItem[]>(() => {
    const items = [
      ...notifications.map(toNotificationFeedItem),
      ...announcements.map(toAnnouncementFeedItem),
    ]
    return items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [notifications, announcements])

  const unreadCount = feed.filter((item) => !item.isRead).length

  const handleItemClick = async (item: FeedItem) => {
    if (item.isRead) return

    try {
      if (item.source === 'notification') {
        await markNotificationAsRead(item.id, access_token)
        mutateNotifications()
      } else {
        await markAnnouncementRead(orgslug, item.id, access_token)
        mutateAnnouncements()
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to mark notification as read', e)
    }
  }

  if (feed.length === 0) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/70 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-hidden dark:border-white/8 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-[#13131a]"></span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 overflow-hidden shadow-2xl rounded-2xl dark:border-white/10 dark:bg-[#18181f]"
      >
        <div className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 p-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Bell size={16} className="text-gray-400 dark:text-white/50" />
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500 mt-1 dark:text-white/50">
              You have {unreadCount} unread notification
              {unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {feed.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={`${item.source}-${item.id}`}
                onClick={() => handleItemClick(item)}
                className={`p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative ${
                  !item.isRead
                    ? 'cursor-pointer bg-blue-50/50 dark:bg-blue-500/10'
                    : ''
                }`}
              >
                {!item.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                )}
                <div className="flex justify-between items-start mb-1 gap-2">
                  <h4
                    className={`flex min-w-0 items-center gap-1.5 text-sm font-bold ${!item.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    {Icon && (
                      <Icon
                        size={13}
                        className="shrink-0 text-gray-400 dark:text-white/50"
                      />
                    )}
                    <span className="truncate">{item.title}</span>
                  </h4>
                  <span className="text-[10px] text-gray-400 dark:text-white/40 whitespace-nowrap ml-4 font-semibold">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                <p
                  className={`text-xs mt-2 whitespace-pre-wrap ${!item.isRead ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {item.body}
                </p>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
