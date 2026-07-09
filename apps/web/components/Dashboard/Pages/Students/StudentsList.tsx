import React, { useState } from 'react'
import StudentsTable from './StudentsTable'
import TopStudentsList from './TopStudentsList'

function StudentsList() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-10 max-w-7xl mx-auto w-full">
      <TopStudentsList />
      <StudentsTable
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  )
}

export default StudentsList
