import { useEffect, useRef } from 'react'
import { sendActivityHeartbeat } from '@services/dashboard/students'
import { useLHSession } from '@components/Contexts/LHSessionContext'

export function useActivityHeartbeat(
  activity_uuid: string | undefined,
  orgId: number | undefined
) {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const lastHeartbeatRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!activity_uuid || !access_token || !orgId) return

    lastHeartbeatRef.current = Date.now()

    const sendHeartbeat = async () => {
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - lastHeartbeatRef.current) / 1000)

      if (elapsedSeconds > 0) {
        try {
          await sendActivityHeartbeat(
            activity_uuid,
            elapsedSeconds,
            access_token
          )
          lastHeartbeatRef.current = now
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Failed to send heartbeat', error)
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendHeartbeat()
      } else {
        lastHeartbeatRef.current = Date.now()
      }
    }

    const handleBeforeUnload = () => {
      sendHeartbeat()
    }

    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }, 30000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      sendHeartbeat() // Send one last time on unmount
    }
  }, [activity_uuid, access_token, orgId])
}
