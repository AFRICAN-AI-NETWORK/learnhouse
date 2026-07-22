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

// Synthesized via Web Audio instead of loading a static file — no asset to
// ship/404 on, and it actually produces sound (the previous /sounds/*.mp3
// path never existed in this repo).
let notificationAudioContext: AudioContext | null = null

const getNotificationAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioContextClass) return null
  if (!notificationAudioContext) {
    notificationAudioContext = new AudioContextClass()
  }
  return notificationAudioContext
}

export const playNotificationSound = () => {
  try {
    const ctx = getNotificationAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const startTime = ctx.currentTime
    const playTone = (
      frequency: number,
      startOffset: number,
      duration: number
    ) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, startTime + startOffset)
      gain.gain.linearRampToValueAtTime(0.2, startTime + startOffset + 0.02)
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        startTime + startOffset + duration
      )
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(startTime + startOffset)
      oscillator.stop(startTime + startOffset + duration)
    }

    // Two-note ascending chime (A5 -> D6), matching the common "ding" pattern.
    playTone(880, 0, 0.12)
    playTone(1175, 0.1, 0.15)
  } catch {
    // Web Audio not supported / blocked — silently ignore
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
