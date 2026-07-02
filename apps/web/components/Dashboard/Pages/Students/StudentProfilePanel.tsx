import React from 'react'

interface StudentProfilePanelProps {
  student: any
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

function StudentProfilePanel({ student }: StudentProfilePanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6 dark:bg-[#13131a] dark:border-white/10">
      <h2 className="font-bold text-xl text-gray-900 mb-6 dark:text-white/90">
        Profile Details
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Email
          </span>
          <span className="text-gray-800 font-medium dark:text-white/80">
            {student.email || '—'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Phone Number
          </span>
          <span className="text-gray-800 font-medium dark:text-white/80">
            {student.phone_number || '—'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Joined Date
          </span>
          <span className="text-gray-800 font-medium dark:text-white/80">
            {formatDate(student.creation_date)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Last Active
          </span>
          <span className="text-gray-800 font-medium dark:text-white/80">
            {formatDate(student.last_active)}
          </span>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Bio
          </span>
          <span className="text-gray-800 font-medium dark:text-white/80">
            {student.bio || 'No bio provided.'}
          </span>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-white/40">
            Roles
          </span>
          <div className="flex flex-wrap gap-2 mt-1">
            {student.roles && student.roles.length > 0 ? (
              student.roles.map((role: any) => (
                <span
                  key={role.role_id}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium dark:bg-white/10 dark:text-white/70"
                >
                  {role.name}
                </span>
              ))
            ) : (
              <span className="text-gray-500 dark:text-white/50 text-sm">
                No roles assigned.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentProfilePanel
