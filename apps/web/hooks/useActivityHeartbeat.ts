import { useEffect, useRef } from 'react'
import { sendActivityHeartbeat } from '../services/dashboard/students'

export function useActivityHeartbeat(
  activityUuid: string | undefined,
  accessToken: string | undefined
) {
  const isVisible = useRef(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = document.visibilityState === 'visible'
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!activityUuid || !accessToken) return

    const tick = () => {
      if (isVisible.current) {
        // Send 30 seconds for each interval
        sendActivityHeartbeat(activityUuid, 30, accessToken).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to submit heartbeat:', err)
        })
      }
    }

    // Submit initial heartbeat immediately upon entry (or wait 30s)
    // Actually, sending 30s immediately might be incorrect, let's just wait the interval.
    const interval = setInterval(tick, 30000)

    return () => clearInterval(interval)
  }, [activityUuid, accessToken])
}
