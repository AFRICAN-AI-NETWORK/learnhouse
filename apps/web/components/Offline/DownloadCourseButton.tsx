'use client'

/**
 * "Make available offline" control.
 *
 * Downloading is explicit rather than automatic so the learner decides what to
 * spend storage on, and can reclaim it (plan Risk 3).
 */

import { useCallback, useEffect, useState } from 'react'
import { Download, Check, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import {
  downloadCourse,
  isCourseDownloaded,
  getCourseDownloadedAt,
  removeCourseDownload,
  type DownloadProgress,
} from '@/lib/offline/download-course'
import { isOfflineReadEnabled } from '@/lib/offline/config'
import { useOffline } from './SyncEngineProvider'

interface DownloadCourseButtonProps {
  courseUuid: string
  className?: string
}

export default function DownloadCourseButton({
  courseUuid,
  className,
}: DownloadCourseButtonProps) {
  const session = useLHSession() as any
  const { isOffline } = useOffline()

  const [downloaded, setDownloaded] = useState(false)
  const [downloadedAt, setDownloadedAt] = useState<number | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [busy, setBusy] = useState(false)

  const accessToken: string | undefined = session?.data?.tokens?.access_token

  /** Pure lookup — no state updates, so the effect can guard against unmount. */
  const fetchState = useCallback(
    async () => ({
      downloaded: await isCourseDownloaded(courseUuid),
      downloadedAt: await getCourseDownloadedAt(courseUuid),
    }),
    [courseUuid]
  )

  const refreshState = useCallback(async () => {
    const next = await fetchState()
    setDownloaded(next.downloaded)
    setDownloadedAt(next.downloadedAt)
  }, [fetchState])

  useEffect(() => {
    if (!isOfflineReadEnabled()) return

    let cancelled = false
    void (async () => {
      const next = await fetchState()
      if (cancelled) return
      setDownloaded(next.downloaded)
      setDownloadedAt(next.downloadedAt)
    })()

    return () => {
      cancelled = true
    }
  }, [fetchState])

  // Hidden entirely while the feature is dark, so nothing changes for users
  // until offline mode is switched on.
  if (!isOfflineReadEnabled()) return null

  const handleDownload = async () => {
    if (!accessToken) {
      toast.error('Please sign in to download this course.')
      return
    }
    if (isOffline) {
      toast.error('You need an internet connection to download a course.')
      return
    }

    setBusy(true)
    setProgress({ phase: 'metadata', completed: 0, total: 3 })

    const result = await downloadCourse(courseUuid, accessToken, setProgress)

    setBusy(false)
    setProgress(null)

    if (!result.ok) {
      toast.error(result.error ?? 'Download failed. Please try again.')
      return
    }

    await refreshState()

    // Report partial media failures honestly rather than claiming a clean run.
    if (result.mediaFailed > 0) {
      toast(
        `Course saved. ${result.mediaFailed} file${result.mediaFailed === 1 ? '' : 's'} could not be downloaded.`,
        { icon: '⚠️' }
      )
    } else {
      toast.success('Course saved for offline use.')
    }
  }

  const handleRemove = async () => {
    setBusy(true)
    await removeCourseDownload(courseUuid)
    await refreshState()
    setBusy(false)
    toast.success('Offline copy removed.')
  }

  if (busy) {
    const label =
      progress?.phase === 'media'
        ? 'Saving files…'
        : progress?.phase === 'activities'
          ? 'Saving lessons…'
          : 'Preparing…'

    return (
      <button
        type="button"
        disabled
        className={cn(
          'flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600',
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </button>
    )
  }

  if (downloaded) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <Check className="h-4 w-4" aria-hidden="true" />
          Available offline
        </span>
        <button
          type="button"
          onClick={handleRemove}
          title={
            downloadedAt
              ? `Downloaded ${new Date(downloadedAt).toLocaleString()}`
              : undefined
          }
          aria-label="Remove offline copy"
          className="rounded-lg border border-zinc-300 p-2 text-zinc-600 hover:bg-zinc-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isOffline}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50',
        className
      )}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      Make available offline
    </button>
  )
}
