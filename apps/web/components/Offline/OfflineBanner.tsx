'use client'

/**
 * Connectivity banner.
 *
 * Renders nothing while online and healthy, so it costs the normal experience
 * nothing. Each degraded state gets its own colour and, more importantly, its own
 * honest message about what the user can still do.
 */

import { CloudOff, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONNECTION_STATUS } from '@/lib/offline/constants'
import { useOffline } from './SyncEngineProvider'

type BannerVariant = {
  className: string
  icon: typeof CloudOff
  message: string
}

export default function OfflineBanner() {
  const { connectionStatus, isOfflineGrace, outbox } = useOffline()

  const variant = resolveVariant(connectionStatus, isOfflineGrace)
  if (!variant) return null

  const Icon = variant.icon
  const queued = outbox.pending + outbox.retrying

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-50 flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        variant.className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{variant.message}</span>
      {queued > 0 && (
        <span className="ml-1 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold">
          {queued} change{queued === 1 ? '' : 's'} waiting to sync
        </span>
      )}
    </div>
  )
}

/**
 * Grace is checked before connectivity: an expiring session is the more urgent
 * problem, because it has a deadline the user cannot recover from once passed.
 */
function resolveVariant(
  status: string,
  isOfflineGrace: boolean
): BannerVariant | null {
  if (isOfflineGrace) {
    return {
      className: 'bg-orange-100 text-orange-900',
      icon: Clock,
      message:
        'Your session has expired. Reconnect soon to keep your saved changes.',
    }
  }

  if (status === CONNECTION_STATUS.OFFLINE) {
    return {
      className: 'bg-red-100 text-red-900',
      icon: CloudOff,
      message: 'You are offline — viewing saved content.',
    }
  }

  if (status === CONNECTION_STATUS.DEGRADED) {
    return {
      className: 'bg-yellow-100 text-yellow-900',
      icon: AlertTriangle,
      message: 'Connection is unstable — changes are being saved locally.',
    }
  }

  return null
}
