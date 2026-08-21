import React, { useState } from 'react'
import { Clock, Award, ChevronDown, ChevronUp } from 'lucide-react'
import StudentCourseDetail from './StudentCourseDetail'
import NextImage from 'next/image'

interface StudentCourseProgressListProps {
  courses: any[]
  userid: number
}

function formatTime(seconds: number) {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StudentCourseProgressList({
  courses,
  userid,
}: StudentCourseProgressListProps) {
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null)

  const toggleCourse = (courseId: number) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null)
    } else {
      setExpandedCourse(courseId)
    }
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xs p-10 text-center border border-gray-100 dark:bg-[#13131a] dark:border-white/10 dark:text-white/50">
        No courses in progress.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 dark:bg-[#13131a] dark:border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-white/10">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white/90">
          Course Progress
        </h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/10">
        {courses.map((course: any) => (
          <React.Fragment key={course.course_id}>
            <div className="p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0 dark:bg-white/10">
                  {course.thumbnail_image ? (
                    <NextImage
                      src={course.thumbnail_image}
                      alt={course.course_name}
                      className="w-full h-full object-cover"
                      width={800}
                      height={800}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                      C
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-gray-900 dark:text-white/90">
                    {course.course_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-white/50">
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium ${course.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'}`}
                    >
                      {course.status === 'completed'
                        ? 'Completed'
                        : 'In Progress'}
                    </span>
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatTime(course.time_spent_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award
                        size={12}
                        className={course.is_certified ? 'text-yellow-500' : ''}
                      />
                      <span>{course.points_earned} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full md:w-48 mt-4 md:mt-0 items-end">
                <div className="w-full flex items-center justify-between text-xs font-medium text-gray-700 dark:text-white/70">
                  <span>
                    {course.completed_activities} / {course.total_activities}
                  </span>
                  <span>{course.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-white/10 overflow-hidden mb-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${course.progress_percentage}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => toggleCourse(course.course_id)}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  {expandedCourse === course.course_id ? (
                    <>
                      Hide Details <ChevronUp size={14} />
                    </>
                  ) : (
                    <>
                      View Details <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
            {expandedCourse === course.course_id && (
              <StudentCourseDetail
                userid={userid}
                courseid={course.course_id}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default StudentCourseProgressList
