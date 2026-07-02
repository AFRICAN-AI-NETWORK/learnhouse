'use client'
import React, { use } from 'react'
import { motion } from 'framer-motion'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import StudentsList from '@components/Dashboard/Pages/Students/StudentsList'

export type StudentsParams = {
  orgslug: string
}

function StudentsPage(props: { params: Promise<StudentsParams> }) {
  const params = use(props.params)

  return (
    <div className="h-screen w-full bg-[#f8f8f8] grid grid-rows-[auto_1fr] dark:bg-[#0f0f13]">
      <div className="pl-10 pr-10 tracking-tight bg-[#fcfbfc] z-10 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] dark:border-b dark:border-white/8 dark:bg-[#13131a] dark:shadow-[0px_8px_24px_rgba(0,0,0,0.35)]">
        <BreadCrumbs type="students"></BreadCrumbs>
        <div className="my-2 py-3">
          <div className="w-100 flex flex-col space-y-1">
            <div className="pt-3 flex font-bold text-4xl tracking-tighter dark:text-white">
              Students Dashboard
            </div>
            <div className="flex font-medium text-gray-400 text-md dark:text-white/45">
              Monitor student progress, track completion, and analyze overall
              activity
            </div>
          </div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1, type: 'spring', stiffness: 80 }}
        className="flex-1 overflow-y-auto"
      >
        <StudentsList />
      </motion.div>
    </div>
  )
}

export default StudentsPage
