import React, { useState } from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { getStudents } from '@services/dashboard/students'
import { Search, ChevronLeft, ChevronRight, Clock, Award, ArrowUpDown } from 'lucide-react'
import UserAvatar from '@components/Objects/UserAvatar'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { useRouter } from 'next/navigation'
import { getUserAvatarMediaDirectory } from '@services/media/media'

interface StudentsTableProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

function formatTime(seconds: number) {
  if (seconds === 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

function StudentsTable({ searchQuery, setSearchQuery }: StudentsTableProps) {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const router = useRouter()

  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<string>('')
  const pageSize = 20

  const { data, isLoading } = useSWR(
    org ? [`students_list_${org.id}`, page, searchQuery, sortBy] : null,
    () => getStudents(org.id, access_token, searchQuery, page, pageSize, sortBy)
  )

  const handleRowClick = (user_id: number) => {
    router.push(`/dash/students/${user_id}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  return (
    <div className="bg-white rounded-xl shadow-xs dark:bg-[#13131a] dark:border dark:border-white/8">
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col -space-y-1">
          <h1 className="font-bold text-xl text-gray-800 dark:text-white/90">
            All Students
          </h1>
          <h2 className="text-gray-500 text-sm dark:text-white/50">
            {data?.total || 0} students found
          </h2>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex items-center">
            <ArrowUpDown className="absolute left-3 h-4 w-4 text-gray-400 dark:text-white/35" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="w-full md:w-auto rounded-md border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-gray-700 outline-none transition-all focus:border-gray-300 focus:ring-2 focus:ring-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:focus:border-white/20 dark:focus:ring-white/10 appearance-none cursor-pointer"
            >
              <option value="">Default Sorting</option>
              <option value="progress_desc">Progress: Highest First</option>
              <option value="progress_asc">Progress: Lowest First</option>
            </select>
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/35" />
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search names or emails..."
              className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/35 dark:focus:border-white/20 dark:focus:ring-white/10"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider dark:bg-white/5 dark:text-white/45">
            <tr>
              <th className="py-3 px-5 font-semibold">Student</th>
              <th className="py-3 px-5 font-semibold">Enrolled</th>
              <th className="py-3 px-5 font-semibold">In Progress</th>
              <th className="py-3 px-5 font-semibold">Completed</th>
              <th className="py-3 px-5 font-semibold">Avg Progress</th>
              <th className="py-3 px-5 font-semibold">Time Spent</th>
              <th className="py-3 px-5 font-semibold">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10 text-sm dark:text-white/80">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <PageLoading />
                </td>
              </tr>
            ) : data?.students?.length > 0 ? (
              data.students.map((student: any) => (
                <tr
                  key={student.user_id}
                  onClick={() => handleRowClick(student.user_id)}
                  className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center space-x-3">
                      <UserAvatar
                        width={40}
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
                        <span className="font-semibold text-gray-900 dark:text-white/90">
                          {student.first_name} {student.last_name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-white/50">
                          {student.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">{student.courses_enrolled}</td>
                  <td className="py-3 px-5">{student.courses_in_progress}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center space-x-1">
                      <span>{student.courses_completed}</span>
                      {student.certificates_count > 0 && (
                        <Award size={14} className="text-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2 dark:bg-white/10 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${student.average_progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold">
                        {student.average_progress}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center space-x-1.5 text-gray-600 dark:text-white/60">
                      <Clock size={14} />
                      <span>
                        {formatTime(student.total_time_spent_seconds)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-gray-500 dark:text-white/50">
                    {formatDate(student.last_active)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-10 text-center text-gray-500 dark:text-white/50"
                >
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && data?.total > pageSize && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-white/10">
          <span className="text-sm text-gray-500 dark:text-white/50">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, data.total)} of {data.total}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-md border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= data.total}
              className="p-1 rounded-md border border-gray-200 text-gray-500 disabled:opacity-50 hover:bg-gray-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentsTable
