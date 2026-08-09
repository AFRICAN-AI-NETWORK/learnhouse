'use client'

/**
 * Offline storage management.
 *
 * Gives users a way to see and reclaim what the app is storing on their device.
 * This exists as much for support as for privacy: "the app is using too much
 * space" becomes self-serve instead of a ticket.
 *
 * Lives under `dash/user-account/**`, which is deliberately exempt from the
 * offline block applied to the rest of `/dash` — the page must work
 * offline, since that is exactly when a user needs to free space.
 */

import { useCallback, useEffect, useState } from 'react'
import { HardDrive, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  getDownloadedCourses,
  removeCourseDownload,
} from '@/lib/offline/download-course'
import {
  getStorageUsage,
  purgeAllAppCaches,
  isPersistentStorageGranted,
  type StorageUsage,
} from '@/lib/offline/storage-policy'
import { clearAllTables } from '@/lib/offline/db'
import { isOfflineReadEnabled } from '@/lib/offline/config'

interface DownloadedCourse {
  courseUuid: string
  name: string
  sizeBytes: number
  cachedAt: number
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB'
  const mb = bytes / (1024 * 1024)
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export default function OfflineStorageSettings() {
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [courses, setCourses] = useState<DownloadedCourse[]>([])
  // Derived from the flag at mount: with offline off there is nothing to load, so
  // the component must not start in a loading state it would never leave.
  const [loading, setLoading] = useState(() => isOfflineReadEnabled())
  const [busy, setBusy] = useState(false)

  /** Pure fetch — no state updates, so the effect can guard against unmount. */
  const fetchSnapshot = useCallback(
    async () => ({
      usage: await getStorageUsage(),
      courses: await getDownloadedCourses(),
    }),
    []
  )

  const load = useCallback(async () => {
    const snapshot = await fetchSnapshot()
    setUsage(snapshot.usage)
    setCourses(snapshot.courses)
    setLoading(false)
  }, [fetchSnapshot])

  useEffect(() => {
    if (!isOfflineReadEnabled()) return

    let cancelled = false
    void (async () => {
      const snapshot = await fetchSnapshot()
      if (cancelled) return
      setUsage(snapshot.usage)
      setCourses(snapshot.courses)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [fetchSnapshot])

  if (!isOfflineReadEnabled()) return null

  const handleRemoveCourse = async (courseUuid: string) => {
    setBusy(true)
    await removeCourseDownload(courseUuid)
    await load()
    setBusy(false)
    toast.success('Offline copy removed.')
  }

  const handleClearAll = async () => {
    // Destructive and irreversible for anything not yet synced, so confirm first.
    const confirmed = window.confirm(
      'Remove all offline data from this device?\n\nAny changes that have not synced yet will be lost.'
    )
    if (!confirmed) return

    setBusy(true)
    await clearAllTables()
    await purgeAllAppCaches()
    await load()
    setBusy(false)
    toast.success('All offline data cleared.')
  }

  const percent = usage
    ? Math.min(100, Math.round(usage.percentOfBudget * 100))
    : 0

  return (
    <section className="space-y-5">
      <header className="flex items-center gap-2">
        <HardDrive className="h-5 w-5 text-zinc-700" aria-hidden="true" />
        <h2 className="text-base font-semibold text-zinc-900">
          Offline storage
        </h2>
      </header>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking storage…
        </p>
      ) : (
        <>
          {usage && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">
                  {formatBytes(usage.used)} used
                </span>
                <span className="text-zinc-500">
                  of {formatBytes(usage.budget)} budget
                </span>
              </div>

              <div
                className="h-2 w-full overflow-hidden rounded-full bg-zinc-200"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Offline storage used"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usage.shouldWarn ? 'bg-amber-500' : 'bg-zinc-900'
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {usage.shouldWarn && (
                <p className="flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  Storage is nearly full. Older files are removed automatically,
                  but removing a course you have finished frees more space.
                </p>
              )}

              {!isPersistentStorageGranted() && (
                <p className="text-xs text-zinc-500">
                  Your browser has not granted persistent storage, so it may
                  clear saved courses when space runs low.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-800">
              Downloaded courses
            </h3>

            {courses.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No courses saved for offline use yet.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                {courses.map((course) => (
                  <li
                    key={course.courseUuid}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {course.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatBytes(course.sizeBytes)} ·{' '}
                        {new Date(course.cachedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleRemoveCourse(course.courseUuid)}
                      aria-label={`Remove offline copy of ${course.name}`}
                      className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleClearAll}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Clear all offline data
          </button>
        </>
      )}
    </section>
  )
}
