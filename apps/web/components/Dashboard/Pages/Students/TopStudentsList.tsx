import React from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { getStudents } from '@services/dashboard/students'
import UserAvatar from '@components/Objects/UserAvatar'
import { Trophy, Star, Medal } from 'lucide-react'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import Link from 'next/link'

function TopStudentsList() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // Fetch a larger first page to determine top students
  const { data, isLoading } = useSWR(
    org ? [`top_students_${org.id}`] : null,
    () => getStudents(org.id, access_token, '', 1, 100)
  )

  if (isLoading || !data?.students) return null

  // Sort by average progress and total points
  const sortedStudents = [...data.students]
    .sort((a: any, b: any) => {
      if (b.average_progress !== a.average_progress) {
        return b.average_progress - a.average_progress
      }
      return b.total_points - a.total_points
    })
    .slice(0, 5)

  if (sortedStudents.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-xs dark:bg-[#13131a] dark:border dark:border-white/8 p-5">
      <div className="flex items-center space-x-2 mb-4 text-gray-800 dark:text-white/90">
        <Trophy className="text-yellow-500" size={24} />
        <h2 className="text-lg font-bold">Top Students</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {sortedStudents.map((student: any, index: number) => (
          <Link
            key={student.user_id}
            href={`/dash/students/${student.user_id}`}
            className="flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-400 hover:shadow-md transition-all dark:bg-white/5 dark:border-white/10 dark:hover:border-indigo-500 group"
          >
            <div className="relative mb-3">
              <UserAvatar
                width={56}
                avatar_url={
                  student.avatar_image
                    ? getUserAvatarMediaDirectory(
                        student.user_uuid,
                        student.avatar_image
                      )
                    : undefined
                }
                username={student.username}
              />
              {index === 0 && (
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-white rounded-full p-1 shadow-sm">
                  <Star size={12} fill="currentColor" />
                </div>
              )}
              {index === 1 && (
                <div className="absolute -top-2 -right-2 bg-gray-300 text-white rounded-full p-1 shadow-sm">
                  <Medal size={12} />
                </div>
              )}
              {index === 2 && (
                <div className="absolute -top-2 -right-2 bg-amber-700 text-white rounded-full p-1 shadow-sm">
                  <Medal size={12} />
                </div>
              )}
            </div>
            <span className="font-bold text-sm text-gray-800 dark:text-white/90 truncate w-full text-center group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {student.first_name} {student.last_name}
            </span>
            <span className="text-xs text-gray-500 dark:text-white/50 truncate w-full text-center">
              @{student.username}
            </span>
            <div className="mt-3 flex items-center justify-between w-full px-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Progress
                </span>
                <span className="font-semibold text-sm dark:text-white/80">
                  {student.average_progress}%
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Points
                </span>
                <span className="font-semibold text-sm dark:text-white/80">
                  {student.total_points}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default TopStudentsList
