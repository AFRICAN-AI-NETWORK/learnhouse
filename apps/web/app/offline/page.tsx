'use client'

/**
 * Offline fallback page.
 *
 * The service worker serves this document for navigations it cannot fulfil from
 * cache. It must therefore be renderable with no network at all: everything shown
 * here comes from IndexedDB.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CloudOff, RefreshCw, ArrowRight } from 'lucide-react'
import africanAiLogo from 'public/african_ai_horizontal.png'
import { openDb } from '@/lib/offline/db'

interface DownloadedCourse {
  courseUuid: string
  name: string
  orgSlug?: string
}

export default function OfflinePage() {
  const [courses, setCourses] = useState<DownloadedCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadDownloadedCourses() {
      try {
        const db = await openDb()
        if (!db) return

        const rows = await db.courses.toArray()
        if (cancelled) return

        setCourses(
          rows.map((row) => ({
            courseUuid: row.course_uuid,
            name: row.data?.name ?? row.data?.course?.name ?? 'Untitled course',
            orgSlug: row.data?.org?.slug,
          }))
        )
      } catch {
        // A failure here is not actionable for the user; the empty state covers it.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDownloadedCourses()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-200 to-slate-300 px-6 py-16">
      <div className="pb-12">
        <Image
          quality={100}
          width={240}
          height={90}
          src={africanAiLogo}
          alt="African AI Network logo"
        />
      </div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5">
          <CloudOff className="h-8 w-8 text-zinc-700" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-black">
          You are offline
        </h1>
        <p className="max-w-md text-base font-medium leading-normal tracking-tight text-zinc-700">
          This page hasn&apos;t been saved for offline use. Anything you already
          downloaded is still available below.
        </p>
      </div>

      <div className="w-full max-w-md pt-10">
        {loading ? (
          <p className="text-center text-sm text-zinc-600">
            Checking saved content&hellip;
          </p>
        ) : courses.length > 0 ? (
          <div className="space-y-2">
            <h2 className="pb-1 text-sm font-semibold tracking-tight text-zinc-800">
              Available offline
            </h2>
            <ul className="space-y-2">
              {courses.map((course) => (
                <li key={course.courseUuid}>
                  <Link
                    href={`/course/${course.courseUuid}`}
                    className="group flex items-center justify-between rounded-lg bg-white/80 px-4 py-3 shadow-sm transition-colors hover:bg-white"
                  >
                    <span className="truncate text-sm font-medium text-zinc-900">
                      {course.name}
                    </span>
                    <ArrowRight
                      className="ml-3 h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 ease-in-out group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-600">
            No courses have been downloaded yet. Reconnect to browse and save
            courses for offline use.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center pt-10">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex h-[50px] w-fit items-center space-x-2 rounded-lg bg-black px-6 py-2 text-lg font-bold text-white shadow-md"
        >
          <RefreshCw className="mr-1 h-5 w-5" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  )
}
