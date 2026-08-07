'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Users } from 'lucide-react'
import { getMarketerStudents } from '@services/referral/marketer.service'
import { MarketerStudentTable, MarketerStudentItem } from '@components/Marketer/MarketerStudentTable'

export default function MarketerStudentsPage() {
  const params = useParams()
  const orgSlug = (params?.orgslug as string) || 'default'

  const [students, setStudents] = useState<MarketerStudentItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadStudents() {
      setIsLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const res = await getMarketerStudents(token, orgSlug, page, 20)
      setIsLoading(false)

      if (res.success && res.data) {
        if (Array.isArray(res.data)) {
          setStudents(res.data)
        } else if (res.data.items) {
          setStudents(res.data.items)
          setTotalPages(res.data.pages || 1)
        }
      }
    }

    loadStudents()
  }, [orgSlug, page])

  const filteredStudents = students.filter(
    (s) =>
      s.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href={`/orgs/${orgSlug}/marketer`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to Marketer Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={24} className="text-indigo-600" />
              Referred Students
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Full list of students who registered using your marketer referral code.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>
      </div>

      <MarketerStudentTable
        students={filteredStudents}
        isLoading={isLoading}
        showPagination={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  )
}
