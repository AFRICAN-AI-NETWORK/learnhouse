import React from 'react'
import { Clock, Award, BookCopy, Target } from 'lucide-react'

interface StudentOverviewCardsProps {
  student: any
}

function formatTime(seconds: number) {
  if (seconds === 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StudentOverviewCards({ student }: StudentOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between dark:bg-[#13131a] dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm font-medium dark:text-white/50">
            Average Progress
          </span>
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Target size={20} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white/90">
            {student.average_progress}%
          </h3>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between dark:bg-[#13131a] dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm font-medium dark:text-white/50">
            Time Spent
          </span>
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Clock size={20} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white/90">
            {formatTime(student.total_time_spent_seconds)}
          </h3>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between dark:bg-[#13131a] dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm font-medium dark:text-white/50">
            Total Points
          </span>
          <div className="p-2 bg-yellow-50 rounded-lg text-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400">
            <Award size={20} />
          </div>
        </div>
        <div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white/90">
            {student.total_points}
          </h3>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-xs border border-gray-100 flex flex-col justify-between dark:bg-[#13131a] dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm font-medium dark:text-white/50">
            Courses Enrolled
          </span>
          <div className="p-2 bg-blue-50 rounded-lg text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
            <BookCopy size={20} />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white/90">
            {student.courses_enrolled}
          </h3>
          <span className="text-sm text-gray-500 font-medium mb-1 dark:text-white/50">
            {student.courses_completed} completed
          </span>
        </div>
      </div>
    </div>
  )
}

export default StudentOverviewCards
