'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, UserCheck, BookOpen } from 'lucide-react'

export interface StudentCourseBreakdown {
  course_id: number
  course_title: string
  purchase_date: string
  commission_amount_usd: number
  commission_status: 'PENDING' | 'ELIGIBLE' | 'PAID' | 'FORFEITED'
}

export interface MarketerStudentItem {
  student_user_id: number
  student_name: string
  student_email: string
  signup_date: string
  courses_purchased_count: number
  total_commission_usd: number
  courses_breakdown?: StudentCourseBreakdown[]
}

interface MarketerStudentTableProps {
  students: MarketerStudentItem[]
  isLoading?: boolean
  showPagination?: boolean
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function MarketerStudentTable({
  students = [],
  isLoading = false,
  showPagination = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: MarketerStudentTableProps) {
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null)

  const toggleExpand = (id: number) => {
    setExpandedStudentId((prev) => (prev === id ? null : id))
  }

  if (isLoading) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  if (students.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-8 text-center space-y-2">
        <UserCheck size={32} className="mx-auto text-gray-400" />
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">No Student Referrals Yet</h4>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Share your referral code with students to start earning $7.70 USD per course purchase.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 bg-gray-50/50 dark:bg-gray-800/40">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Signup Date</th>
              <th className="py-3 px-4">Courses Purchased</th>
              <th className="py-3 px-4">Total Commission</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {students.map((student) => {
              const isExpanded = expandedStudentId === student.student_user_id
              const breakdown = student.courses_breakdown || []

              return (
                <React.Fragment key={student.student_user_id}>
                  <tr
                    onClick={() => toggleExpand(student.student_user_id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {student.student_name || 'Anonymous Student'}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        {student.student_email}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono">
                      {student.signup_date ? new Date(student.signup_date).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                        <BookOpen size={12} />
                        {student.courses_purchased_count} {student.courses_purchased_count === 1 ? 'Course' : 'Courses'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      ${(student.total_commission_usd || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right text-gray-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>

                  {/* Expandable Per-Course Breakdown */}
                  {isExpanded && (
                    <tr className="bg-gray-50/70 dark:bg-gray-800/30">
                      <td colSpan={5} className="p-4">
                        <div className="pl-4 border-l-2 border-indigo-500 space-y-2">
                          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                            Course Purchase Breakdown
                          </span>

                          {breakdown.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No detailed course breakdown available.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {breakdown.map((course, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                                >
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {course.course_title}
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-gray-400 font-mono">
                                      {new Date(course.purchase_date).toLocaleDateString()}
                                    </span>
                                    <span className="font-bold text-emerald-600 font-mono">
                                      ${course.commission_amount_usd.toFixed(2)}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        course.commission_status === 'PAID'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : course.commission_status === 'ELIGIBLE'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {course.commission_status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Optional Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50 hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
