'use client'

/**
 * Sync status drawer (plan Layer 6.3).
 *
 * Lists every queued and failed mutation so a user is never left guessing whether
 * their offline work survived. Failed rows can be retried or dismissed — dismissal
 * is a terminal state that stops alerting without silently deleting the record.
 */

import { useCallback, useEffect, useState } from 'react'
import { X, RefreshCw, Trash2, AlertCircle, Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { openDb } from '@/lib/offline/db'
import type { OutboxRecord } from '@/lib/offline/db'
import { retryRow, dismissRow } from '@/lib/offline/outbox'
import { OUTBOX_STATUS } from '@/lib/offline/constants'
import { useOffline } from './SyncEngineProvider'

interface SyncStatusPanelProps {
  open: boolean
  onClose: () => void
}

/** Turns an internal operation label into something a learner can read. */
function describeOperation(row: OutboxRecord): string {
  const labels: Record<string, string> = {
    'trail.complete_activity': 'Marked an activity complete',
    'trail.uncomplete_activity': 'Un-marked an activity',
    'assignment.submit': 'Assignment submission',
    'quiz.submit': 'Quiz answers',
    'notification.read': 'Marked a notification read',
  }
  return labels[row.type] ?? row.type
}

function statusMeta(status: string) {
  switch (status) {
    case OUTBOX_STATUS.PENDING:
      return { label: 'Waiting', icon: Clock, className: 'text-zinc-600' }
    case OUTBOX_STATUS.RETRYING:
      return { label: 'Retrying', icon: RefreshCw, className: 'text-amber-600' }
    case OUTBOX_STATUS.FAILED:
      return { label: 'Failed', icon: AlertCircle, className: 'text-red-600' }
    case OUTBOX_STATUS.FAILED_DISMISSED:
      return { label: 'Dismissed', icon: Trash2, className: 'text-zinc-400' }
    default:
      return { label: 'Synced', icon: Check, className: 'text-green-600' }
  }
}

export default function SyncStatusPanel({
  open,
  onClose,
}: SyncStatusPanelProps) {
  const { sync, refreshOutbox } = useOffline()
  const [rows, setRows] = useState<OutboxRecord[]>([])
  const [busy, setBusy] = useState(false)

  /**
   * Pure fetch — no state updates. Keeping retrieval separate from rendering lets
   * both the effect and the action handlers reuse it without either of them
   * setting state on an unmounted component.
   */
  const fetchRows = useCallback(async (): Promise<OutboxRecord[]> => {
    const db = await openDb()
    if (!db) return []
    try {
      const all = await db.outbox.orderBy('created_at').reverse().toArray()
      // Synced rows are noise here; the indicator already conveys "all clear".
      return all.filter((row) => row.status !== OUTBOX_STATUS.SYNCED)
    } catch {
      return []
    }
  }, [])

  const load = useCallback(async () => {
    setRows(await fetchRows())
  }, [fetchRows])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    void (async () => {
      const next = await fetchRows()
      if (!cancelled) setRows(next)
    })()

    return () => {
      cancelled = true
    }
  }, [open, fetchRows])

  // Close on Escape — expected of any drawer, and the only keyboard exit here.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleRetry = async (id?: number) => {
    if (id === undefined) return
    setBusy(true)
    await retryRow(id)
    await sync()
    await load()
    await refreshOutbox()
    setBusy(false)
  }

  const handleDismiss = async (id?: number) => {
    if (id === undefined) return
    await dismissRow(id)
    await load()
    await refreshOutbox()
  }

  const handleRetryAll = async () => {
    setBusy(true)
    await sync()
    await load()
    await refreshOutbox()
    setBusy(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label="Sync status"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Sync status</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sync status"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <p className="pt-8 text-center text-sm text-zinc-600">
              Everything is synced. No pending changes.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const meta = statusMeta(row.status)
                const Icon = meta.icon
                const isFailed = row.status === OUTBOX_STATUS.FAILED

                return (
                  <li
                    key={row.id}
                    className="rounded-lg border border-zinc-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {describeOperation(row)}
                        </p>
                        <p className="pt-0.5 text-xs text-zinc-500">
                          {new Date(row.created_at).toLocaleString()}
                          {row.retry_count > 0 &&
                            ` · ${row.retry_count} attempt${row.retry_count === 1 ? '' : 's'}`}
                        </p>
                        {isFailed && row.error_message && (
                          <p className="pt-1 text-xs text-red-600">
                            {row.error_message}
                          </p>
                        )}
                      </div>

                      <span
                        className={cn(
                          'flex shrink-0 items-center gap-1 text-xs font-medium',
                          meta.className
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.label}
                      </span>
                    </div>

                    {isFailed && (
                      <div className="flex gap-2 pt-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRetry(row.id)}
                          className="rounded-md bg-zinc-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismiss(row.id)}
                          className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {rows.length > 0 && (
          <footer className="border-t border-zinc-200 px-5 py-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleRetryAll}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw
                className={cn('h-4 w-4', busy && 'animate-spin')}
                aria-hidden="true"
              />
              {busy ? 'Syncing…' : 'Sync now'}
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}
