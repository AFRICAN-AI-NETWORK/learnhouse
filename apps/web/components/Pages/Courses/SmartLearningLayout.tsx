'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { getUriWithOrg } from '@services/config/config'
import { Check, ChevronLeft, Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SmartLearningLayoutProps {
  course: any
  currentActivityUuid?: string
  orgslug: string
  children: React.ReactNode
  rightProgressTracker?: React.ReactNode
  trailData?: any
}

export default function SmartLearningLayout({
  course,
  currentActivityUuid,
  orgslug,
  children,
  rightProgressTracker,
  trailData,
}: SmartLearningLayoutProps) {
  const { t } = useTranslation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const cleanActivityUuid = (uuid: string) => uuid?.replace('activity_', '')
  const currentCleanActivityUuid = currentActivityUuid
    ? cleanActivityUuid(currentActivityUuid)
    : ''

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full bg-[#f8fafc]">
      {/* Left Sidebar - Curriculum */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:block ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-bold text-gray-900 line-clamp-1">
              {course?.name}
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Curriculum List */}
          <div className="flex-1 overflow-y-auto py-4">
            {course?.chapters?.map((chapter: any, chapterIdx: number) => (
              <div key={chapter.chapter_uuid} className="mb-4">
                <div className="px-5 py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Module {chapterIdx + 1}: {chapter.name}
                  </h3>
                </div>
                <div className="mt-1 space-y-1">
                  {chapter.activities?.map(
                    (activity: any, activityIdx: number) => {
                      const isActive =
                        cleanActivityUuid(activity.activity_uuid) ===
                        currentCleanActivityUuid
                      // Check completion using trailData
                      const run = trailData?.runs?.find(
                        (r: any) =>
                          r.course_uuid === course.course_uuid ||
                          r.course?.course_uuid === course.course_uuid
                      )
                      const isCompleted = run?.steps?.find(
                        (step: any) =>
                          step.activity_uuid === activity.activity_uuid &&
                          step.complete === true
                      )

                      return (
                        <Link
                          key={activity.activity_uuid}
                          href={getUriWithOrg(
                            orgslug,
                            `/course/${course.course_uuid.replace('course_', '')}/activity/${cleanActivityUuid(
                              activity.activity_uuid
                            )}`
                          )}
                          className={`group flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700 font-semibold'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              isCompleted
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : isActive
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-gray-300 text-gray-400 group-hover:border-gray-400'
                            }`}
                          >
                            {isCompleted ? (
                              <Check size={12} />
                            ) : (
                              <span className="text-[10px]">
                                {activityIdx + 1}
                              </span>
                            )}
                          </div>
                          <span className="line-clamp-2 flex-1">
                            {activity.name}
                          </span>
                        </Link>
                      )
                    }
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header Toggle */}
        <div className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-gray-900">
            Curriculum
          </span>
        </div>

        {/* Center Column - Dynamic Content */}
        <div className="flex flex-1 xl:flex-row flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
            <div className="mx-auto max-w-3xl">{children}</div>
          </div>

          {/* Right Column - Progress Tracker (Desktop only) */}
          {rightProgressTracker && (
            <aside className="hidden w-80 border-l border-gray-200 bg-white px-6 py-8 xl:block">
              <div className="sticky top-8">{rightProgressTracker}</div>
            </aside>
          )}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
