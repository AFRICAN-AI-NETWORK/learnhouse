// Utility helpers for sounds, browser notifications, and permission requests.

import {
  CheckCircle2,
  BookOpen,
  FileText,
  Megaphone,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { NotificationType } from '@/types/notifications'

/** Small type badge icon for a notification, used by NotificationBell. */
export const getNotificationIcon = (type: NotificationType): LucideIcon => {
  if (type === 'assignment_reviewed') return CheckCircle2
  if (type === 'retake_requested') return RotateCcw
  if (type === 'chapter_added') return BookOpen
  if (type === 'activity_added') return FileText
  return Megaphone
}

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {
      // Autoplay may be blocked — silently ignore
    })
  } catch {
    // Audio not supported
  }
}

export const requestNotificationPermission =
  async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission === 'granted') return 'granted'
    if (Notification.permission === 'denied') return 'denied'
    return Notification.requestPermission()
  }

interface BrowserNotificationOptions {
  body?: string
  icon?: string
  tag?: string
  conversationId?: string
  userId?: number
  /** Called when the user clicks the browser notification. */
  onClick?: () => void
}

export const showBrowserNotification = (
  title: string,
  options: BrowserNotificationOptions = {}
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const { body, icon = '/favicon.ico', tag, onClick } = options

  const notification = new Notification(title, { body, icon, tag })

  notification.onclick = (event) => {
    event.preventDefault()
    // Bring the browser tab/window into focus
    window.focus()
    // Navigate to the relevant conversation
    onClick?.()
    notification.close()
  }
}
