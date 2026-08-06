import React, { useState } from 'react'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import { getTopStudents } from '@services/dashboard/students'
import UserAvatar from '@components/Objects/UserAvatar'
import {
  Trophy,
  Star,
  Medal,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function TopStudentsList() {
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  const [daysFilter, setDaysFilter] = useState<number | undefined>(undefined)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [limit, setLimit] = useState(5)

  const { data, isLoading } = useSWR(
    org ? [`top_students_${org.id}`, limit, daysFilter] : null,
    () => getTopStudents(org.id, access_token, limit, daysFilter)
  )

  const formatTime = (seconds: number) => {
    if (!seconds) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  const handleDownloadPdf = async () => {
    if (!org) return
    setIsGeneratingPdf(true)
    try {
      // Fetch top 1000 to get everyone for the selected timeframe
      const reportData = await getTopStudents(
        org.id,
        access_token,
        1000,
        daysFilter
      )
      if (!reportData || !reportData.students) return

      const doc = new jsPDF()

      const timeframeText = daysFilter ? `Last ${daysFilter} Days` : 'All Time'
      doc.setFontSize(16)
      doc.text(`Student Progress Report (${timeframeText})`, 14, 15)
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)

      const tableData = reportData.students.map((s: any, idx: number) => [
        idx + 1,
        `${s.first_name} ${s.last_name}`,
        `@${s.username}`,
        `${s.average_progress}%`,
        s.total_points,
        formatTime(s.total_time_spent_seconds),
      ])

      autoTable(doc, {
        startY: 30,
        head: [
          ['Rank', 'Name', 'Username', 'Progress', 'Points', 'Time Spent'],
        ],
        body: tableData,
      })

      doc.save(`Student_Report_${timeframeText.replace(/ /g, '_')}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  if (isLoading || !data?.students) return null

  const sortedStudents = data.students

  if (sortedStudents.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-xs dark:bg-[#13131a] dark:border dark:border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-gray-800 dark:text-white/90">
          <Trophy className="text-yellow-500" size={24} />
          <h2 className="text-lg font-bold">Top Students</h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex items-center space-x-1 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            <span>{isGeneratingPdf ? 'Generating...' : 'Report'}</span>
          </button>
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-400 dark:text-white/50" size={16} />
            <select
              value={daysFilter || ''}
              onChange={(e) =>
                setDaysFilter(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="text-sm border border-gray-200 rounded-md py-1.5 px-2 bg-white text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="60">Last 60 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
            </select>
          </div>
        </div>
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
      {sortedStudents.length >= 5 && (
        <div className="mt-6 flex justify-center">
          {limit === 5 ? (
            <button
              onClick={() => setLimit(1000)}
              className="flex items-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 px-4 py-2 rounded-full"
            >
              <span>View Full Leaderboard</span>
              <ChevronDown size={16} />
            </button>
          ) : (
            <button
              onClick={() => setLimit(5)}
              className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2 rounded-full"
            >
              <span>Collapse Leaderboard</span>
              <ChevronUp size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TopStudentsList
