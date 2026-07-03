import React from 'react'
import useSWR from 'swr'
import { getStudentCourseDetail } from '@services/dashboard/students'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface StudentCourseDetailProps {
  userid: number
  courseid: number
}

function formatTime(seconds: number) {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StudentCourseDetail({ userid, courseid }: StudentCourseDetailProps) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const { data: courseDetail, isLoading } = useSWR(
    org ? [`student_course_detail_${org.id}_${userid}_${courseid}`] : null,
    () => getStudentCourseDetail(org.id, userid, courseid, access_token)
  )

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center w-full">
        <PageLoading />
      </div>
    )
  }

  if (!courseDetail || !courseDetail.chapters) {
    return null
  }

  return (
    <div className="w-full bg-gray-50 border-t border-gray-100 p-5 dark:bg-[#0f0f13] dark:border-white/5">
      <h4 className="font-semibold text-gray-900 mb-4 dark:text-white/90">
        Chapter Breakdown
      </h4>
      <div className="flex flex-col gap-6">
        {courseDetail.chapters.map((chapter: any) => (
          <div key={chapter.chapter_id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h5 className="font-medium text-sm text-gray-700 dark:text-white/70">
                {chapter.name}
              </h5>
              <span className="text-xs text-gray-500 font-medium dark:text-white/50">
                {chapter.completed_activities} / {chapter.total_activities}{' '}
                Completed
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {chapter.activities.map((activity: any) => (
                <div
                  key={activity.activity_id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 dark:bg-white/5 dark:border-white/5"
                >
                  <div className="flex items-center gap-3">
                    {activity.complete ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : (
                      <Circle
                        size={16}
                        className="text-gray-300 dark:text-white/20"
                      />
                    )}
                    <span
                      className={`text-sm ${activity.complete ? 'text-gray-900 dark:text-white/90' : 'text-gray-500 dark:text-white/50'}`}
                    >
                      {activity.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-white/50">
                    {activity.points_earned > 0 && (
                      <span>{activity.points_earned} pts</span>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatTime(activity.time_spent_seconds)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StudentCourseDetail
