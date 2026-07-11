'use client'

import React, { useState } from 'react'
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
import { useMediaQuery } from 'usehooks-ts'

export function AnnouncementBell({ orgslug }: { orgslug: string }) {
  const session = useLHSession() as any
  const access_token: string = session?.data?.tokens?.access_token ?? ''
  const isMobile = useMediaQuery('(max-width: 768px)')

  const [isOpen, setIsOpen] = useState(false)

  const { data: announcements = [], mutate } = useSWR(
    orgslug && access_token
      ? [`${orgslug}_announcements_active`, access_token]
      : null,
    ([, token]) => fetchAnnouncements(orgslug, true, token as string)
  )

  const unreadCount = announcements.filter(
    (a: Announcement) => !a.is_read
  ).length

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
  }

  const handleAnnouncementClick = async (announcement: Announcement) => {
    if (!announcement.is_read) {
      try {
        await markAnnouncementRead(orgslug, announcement.id, access_token)
        mutate() // Refresh the unread count and list
      } catch (e) {
        console.error('Failed to mark announcement as read', e)
      }
    }
  }

  if (announcements.length === 0) return null

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/70 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-hidden dark:border-white/8 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Announcements"
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
            Announcements
          </h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500 mt-1 dark:text-white/50">
              You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {announcements.map((ann: Announcement) => (
            <div
              key={ann.id}
              onClick={() => handleAnnouncementClick(ann)}
              className={`p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative ${
                !ann.is_read ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''
              }`}
            >
              {!ann.is_read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
              )}
              <div className="flex justify-between items-start mb-1">
                <h4
                  className={`text-sm font-bold ${!ann.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {ann.title}
                </h4>
                <span className="text-[10px] text-gray-400 dark:text-white/40 whitespace-nowrap ml-4 font-semibold">
                  {new Date(ann.creation_date).toLocaleDateString()}
                </span>
              </div>
              <p
                className={`text-xs mt-2 whitespace-pre-wrap ${!ann.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}
              >
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
