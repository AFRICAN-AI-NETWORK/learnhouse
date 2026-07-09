import React, { useState } from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { getStudentDetail } from '@services/dashboard/students'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import StudentOverviewCards from './StudentOverviewCards'
import StudentCourseProgressList from './StudentCourseProgressList'
import StudentProfilePanel from './StudentProfilePanel'
import { User, BookCopy, LayoutDashboard } from 'lucide-react'
import UserAvatar from '@components/Objects/UserAvatar'
import { getUserAvatarMediaDirectory } from '@services/media/media'

interface StudentDetailProps {
  userid: number
}

function StudentDetail({ userid }: StudentDetailProps) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  // We need the numeric userId for the API, but the route gives us the UUID.
  // Wait, does the backend endpoint take user_id or user_uuid?
  // Let's check `orgs/{org_id}/students/{user_id}`.
  // Wait, I should verify if user_id is the numeric ID or UUID.

  return (
    <div className="flex flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
      <StudentDetailInner userid={userid} />
    </div>
  )
}

function StudentDetailInner({ userid }: { userid: number }) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [activeTab, setActiveTab] = useState<
    'overview' | 'courses' | 'profile'
  >('overview')

  const { data: student, isLoading } = useSWR(
    org ? [`student_detail_${org.id}_${userid}`] : null,
    () => getStudentDetail(org.id, userid, access_token)
  )

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center py-20">
        <PageLoading />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex-1 flex justify-center py-20 text-gray-500">
        Student not found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-xs p-5 flex flex-col md:flex-row gap-5 items-start md:items-center dark:bg-[#13131a] dark:border dark:border-white/8">
        <UserAvatar
          width={80}
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
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-gray-500 dark:text-white/50">
            @{student.username}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit dark:bg-white/5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
            activeTab === 'overview'
              ? 'bg-white shadow-sm text-gray-900 dark:bg-[#13131a] dark:text-white/90 dark:border dark:border-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-white/50 dark:hover:text-white/90 dark:hover:bg-white/10'
          }`}
        >
          <LayoutDashboard size={16} />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
            activeTab === 'courses'
              ? 'bg-white shadow-sm text-gray-900 dark:bg-[#13131a] dark:text-white/90 dark:border dark:border-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-white/50 dark:hover:text-white/90 dark:hover:bg-white/10'
          }`}
        >
          <BookCopy size={16} />
          <span>Courses</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
            activeTab === 'profile'
              ? 'bg-white shadow-sm text-gray-900 dark:bg-[#13131a] dark:text-white/90 dark:border dark:border-white/10'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-white/50 dark:hover:text-white/90 dark:hover:bg-white/10'
          }`}
        >
          <User size={16} />
          <span>Profile</span>
        </button>
      </div>

      {activeTab === 'overview' && <StudentOverviewCards student={student} />}
      {activeTab === 'courses' && (
        <StudentCourseProgressList courses={student.courses} userid={userid} />
      )}
      {activeTab === 'profile' && <StudentProfilePanel student={student} />}
    </div>
  )
}

export default StudentDetail
