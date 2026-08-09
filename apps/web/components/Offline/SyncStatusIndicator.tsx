'use client'

/**
 * Sync status icon.
 *
 * Deliberately silent when there is nothing to report — a permanent green tick on
 * every page is noise. It appears only when work is queued or has failed, which is
 * exactly when the user needs to know.
 */

import { useState } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOffline } from './SyncEngineProvider'
import SyncStatusPanel from './SyncStatusPanel'

export default function SyncStatusIndicator({
  className,
}: {
  className?: string
}) {
  const { outbox } = useOffline()
  const [open, setOpen] = useState(false)

  const inFlight = outbox.pending + outbox.retrying
  const hasFailures = outbox.failed > 0

  if (inFlight === 0 && !hasFailures) return null

  const label = hasFailures
    ? `${outbox.failed} change${outbox.failed === 1 ? '' : 's'} failed to sync`
    : `${inFlight} change${inFlight === 1 ? '' : 's'} waiting to sync`

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          hasFailures
            ? 'text-red-600 hover:bg-red-50'
            : 'text-amber-600 hover:bg-amber-50',
          className
        )}
      >
        {hasFailures ? (
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
        )}

        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-bold text-white">
          {hasFailures ? outbox.failed : inFlight}
        </span>
      </button>

      <SyncStatusPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
