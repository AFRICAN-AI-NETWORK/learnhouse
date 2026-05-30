'use client'
import { AssignmentsTaskProvider } from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { LayoutList } from 'lucide-react'
import React from 'react'
import AssignmentTasks from '../_components/Tasks'
import { AssignmentProvider } from '@components/Contexts/Assignments/AssignmentContext'
import dynamic from 'next/dynamic'
import { useTranslation } from 'react-i18next'
const AssignmentTaskEditor = dynamic(
  () => import('../_components/TaskEditor/TaskEditor')
)

import { useAssignmentsTask } from '@components/Contexts/Assignments/AssignmentsTaskContext'

function KeyedAssignmentTaskEditor() {
  const taskState = useAssignmentsTask() as any
  return (
    <AssignmentTaskEditor
      key={taskState?.selectedAssignmentTaskUUID}
      page="general"
    />
  )
}

function AssignmentEditorSubPage({
  assignmentuuid,
}: {
  assignmentuuid: string
}) {
  const { t } = useTranslation()
  return (
    <AssignmentsTaskProvider>
      <div className="flex w-full shrink-0 flex-col border-b border-slate-100 custom-dots-bg lg:h-full lg:w-[320px] xl:w-[400px] lg:border-b-0 lg:border-r">
        <div className="flex mx-auto px-3.5 py-1 bg-neutral-600/80 space-x-2 my-5 items-center text-sm font-bold text-white rounded-full">
          <LayoutList size={18} />
          <p>{t('dashboard.assignments.editor.tasks_title')}</p>
        </div>
        <AssignmentTasks assignment_uuid={'assignment_' + assignmentuuid} />
      </div>
      <div className="flex min-w-0 grow bg-[#fefcfe] nice-shadow h-full w-full">
        <AssignmentProvider assignment_uuid={'assignment_' + assignmentuuid}>
          <KeyedAssignmentTaskEditor />
        </AssignmentProvider>
      </div>
    </AssignmentsTaskProvider>
  )
}

export default AssignmentEditorSubPage
