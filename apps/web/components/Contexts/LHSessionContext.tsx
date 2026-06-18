'use client'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { useSession, signOut } from 'next-auth/react'
import React, { useContext, createContext, useEffect } from 'react'

export const SessionContext = createContext({}) as any

const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes in milliseconds
const LAST_ACTIVE_KEY = 'learnhouse_last_active'

function LHSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSession()

  useEffect(() => {
    if (session && session.status === 'authenticated') {
      // Initialize last active time
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())

      const updateActivity = () => {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString())
      }

      // Events to listen to
      const activityEvents = [
        'mousemove',
        'mousedown',
        'keypress',
        'scroll',
        'touchstart',
        'click',
      ]

      // Add event listeners
      activityEvents.forEach((event) => {
        window.addEventListener(event, updateActivity, { passive: true })
      })

      // Check inactivity interval (check every 5 seconds)
      const interval = setInterval(() => {
        const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY)
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10)
          const now = Date.now()

          const isMediaPlaying = Array.from(
            document.querySelectorAll('video, audio')
          ).some((media: any) => !media.paused && !media.ended)
          const isIframeFocused = document.activeElement?.tagName === 'IFRAME'

          if (isMediaPlaying || isIframeFocused) {
            updateActivity()
          } else if (now - lastActive >= INACTIVITY_TIMEOUT) {
            signOut({ callbackUrl: '/' })
          }
        }
      }, 5000)

      return () => {
        // Cleanup
        activityEvents.forEach((event) => {
          window.removeEventListener(event, updateActivity)
        })
        clearInterval(interval)
      }
    }
  }, [session])

  if (session && session.status == 'loading') {
    return <PageLoading />
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}

export function useLHSession() {
  return useContext(SessionContext)
}

export default LHSessionProvider
