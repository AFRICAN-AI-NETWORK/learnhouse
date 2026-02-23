'use client'
import React, { useState, useEffect } from 'react'
import { WaitlistCourseItem } from '@/types/waitlist'
import { AlertCircle } from 'lucide-react'
import { getWaitlistCourses } from '@services/waitlist/waitlist'
import { Badge } from '@/components/ui/badge'

interface CourseSelectorProps {
  waitlistUuid: string
  selected: number[]
  onChange: (ids: number[]) => void
  isLoading?: boolean
}

function CourseSelector({
  waitlistUuid,
  selected,
  onChange,
  isLoading = false,
}: CourseSelectorProps) {
  const [courses, setCourses] = useState<WaitlistCourseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const res = await getWaitlistCourses(waitlistUuid)

        if (!res.success) {
          throw new Error(res.data?.detail || 'Failed to fetch courses')
        }

        const data = Array.isArray(res.data) ? res.data : res.data?.data || []

        setCourses(data)
        setError('')
      } catch (err: any) {
        setError(err.message || 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    }

    if (waitlistUuid) {
      fetchCourses()
    }
  }, [waitlistUuid])

  const toggle = (courseId: number) => {
    const exists = selected.includes(courseId)

    const next = exists
      ? selected.filter((c) => c !== courseId)
      : [...selected, courseId]

    onChange(next)
  }

  const freeCount = selected.filter(
    (id) => courses.find((c) => c.course_id === id)?.is_free
  ).length

  const paidCount = selected.length - freeCount

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-900 border border-rose-200">
        <AlertCircle size={18} className="mt-1 shrink-0" />

        <div className="text-sm">
          <p className="font-bold">Error loading courses</p>
          <p className="opacity-90">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-h-[6y0vh] overflow-hidden space-y-4">
      <h3 className="text-lg font-bold text-slate-900">
        Select the courses you're interested in
      </h3>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => {
                const isSelected = selected.includes(course.course_id)

                return (
                  <button
                    key={course.course_id}
                    type="button"
                    onClick={() => toggle(course.course_id)}
                    className={`relative text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'border-black bg-white shadow-md ring-2 ring-black/10'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-1 w-5 h-5 flex-shrink-0"
                      />

                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 break-words">
                            {course.name}
                          </span>

                          {/* Price Badge */}
                          {course.is_free ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0"
                            >
                              🟢 FREE
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0"
                            >
                              💰 {course.currency || '₦'}
                              {course.price?.toLocaleString()}
                            </Badge>
                          )}
                        </div>

                        {course.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2 break-words">
                            {course.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {courses.length === 0 && !loading && (
                <div className="col-span-full p-6 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <p className="text-sm text-slate-600">
                    No courses available at the moment
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {selected.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {selected.length}
                </span>{' '}
                course{selected.length !== 1 ? 's' : ''} selected (
                <span className="text-emerald-700 font-medium">
                  {freeCount}
                </span>{' '}
                free,{' '}
                <span className="text-amber-700 font-medium">{paidCount}</span>{' '}
                paid)
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CourseSelector
