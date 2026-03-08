'use client'

import React, { createContext, useCallback, useState, useEffect } from 'react'

interface NotificationContextType {
  unreadCount: number
  setUnreadCount: (count: number) => void
  incrementUnreadCount: () => void
  resetUnreadCount: () => void
  windowFocused: boolean
}

export const NotificationContext = createContext<
  NotificationContextType | undefined
>(undefined)

interface NotificationProviderProps {
  children: React.ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [windowFocused, setWindowFocused] = useState(true)

  const incrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => prev + 1)
  }, [])

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  // Track window focus
  useEffect(() => {
    const handleFocus = () => setWindowFocused(true)
    const handleBlur = () => setWindowFocused(false)

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Update document title with unread count
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const baseTitle = 'Chat'
      if (unreadCount > 0) {
        document.title = `${baseTitle} (${unreadCount})`
      } else {
        document.title = baseTitle
      }
    }
  }, [unreadCount])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        setUnreadCount,
        incrementUnreadCount,
        resetUnreadCount,
        windowFocused,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
