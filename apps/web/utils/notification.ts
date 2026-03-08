/**
 * Notification utilities: sound, permissions, desktop notifications
 */

/**
 * Play notification sound
 */
export const playNotificationSound = async () => {
  try {
    // Use a simple beep sound - you can replace with a custom sound file
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.connect(gain)
    gain.connect(audioContext.destination)

    oscillator.frequency.value = 800 // Hz
    oscillator.type = 'sine'

    gain.gain.setValueAtTime(0.3, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (_error) {
    // Silently fail if audio context is not supported
  }
}

/**
 * Request browser notification permission
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (_error) {
      return false
    }
  }

  return false
}

/**
 * Show browser notification
 */
export const showBrowserNotification = (
  title: string,
  options?: NotificationOptions & { conversationId?: string; userId?: number }
) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })

    // Click handler to focus window and potentially navigate
    notification.onclick = () => {
      window.focus()
      if (options?.conversationId) {
        // Navigation will be handled by the calling component
        window.dispatchEvent(
          new CustomEvent('notification-click', {
            detail: {
              conversationId: options.conversationId,
              userId: options.userId,
            },
          })
        )
      }
      notification.close()
    }
  } catch (_error) {
    // Silently fail if browser notification creation fails
  }
}

/**
 * Check if app window is currently focused
 */
export const isAppFocused = (): boolean => {
  return typeof document !== 'undefined' && document.hasFocus()
}
