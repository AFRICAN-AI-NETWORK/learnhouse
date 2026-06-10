'use client'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { useSession, signOut } from 'next-auth/react'
import React, { useContext, createContext, useEffect, useRef } from 'react'

export const SessionContext = createContext({}) as any

function LHSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const lastActiveTimeRef = useRef<number>(0)

  useEffect(() => {
    if (session?.status === 'authenticated') {
      const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']

      // Update last active time, but throttle it to at most once per second
      let isThrottled = false
      const handleActivity = () => {
        if (!isThrottled) {
          lastActiveTimeRef.current = Date.now()
          isThrottled = true
          setTimeout(() => {
            isThrottled = false
          }, 1000)
        }
      }

      // Set initial active time
      lastActiveTimeRef.current = Date.now()

      events.forEach((event) => {
        window.addEventListener(event, handleActivity, { passive: true })
      })

      // Check inactivity every 1 minute
      const intervalId = setInterval(() => {
        if (Date.now() - lastActiveTimeRef.current > 10 * 60 * 1000) {
          // 10 minutes
          signOut()
        }
      }, 60000) // 1 minute

      return () => {
        clearInterval(intervalId)
        events.forEach((event) => {
          window.removeEventListener(event, handleActivity)
        })
      }
    }
  }, [session?.status])

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
