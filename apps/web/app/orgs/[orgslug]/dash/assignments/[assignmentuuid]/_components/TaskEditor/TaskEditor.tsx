'use client'
import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import {
  useAssignmentsTask,
  useAssignmentsTaskDispatch,
} from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getAPIUrl } from '@services/config/config'
import { deleteAssignmentTask } from '@services/courses/assignments'
import { GalleryVerticalEnd, Info, TentTree, Trash } from 'lucide-react'
import React from 'react'
import toast from 'react-hot-toast'
import { mutate } from 'swr'
import dynamic from 'next/dynamic'
import { AssignmentTaskGeneralEdit } from './Subs/AssignmentTaskGeneralEdit'
const AssignmentTaskContentEdit = dynamic(
  () => import('./Subs/AssignmentTaskContentEdit')
)

function AssignmentTaskEditor({ page }: any) {
  const [selectedSubPage, setSelectedSubPage] = React.useState(page)
  const assignment = useAssignments() as any
  const assignmentTaskState = useAssignmentsTask() as any
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token

  async function deleteTaskUI() {
    const res = await deleteAssignmentTask(
      assignmentTaskState.assignmentTask.assignment_task_uuid,
      assignment.assignment_object.assignment_uuid,
      access_token
    )
    if (res) {
      assignmentTaskStateHook({
        type: 'SET_MULTIPLE_STATES',
        payload: {
          selectedAssignmentTaskUUID: null,
          assignmentTask: {},
        },
      })
      mutate(
        `${getAPIUrl()}assignments/${assignment.assignment_object.assignment_uuid}/tasks`
      )
      mutate(
        `${getAPIUrl()}assignments/${assignment.assignment_object.assignment_uuid}`
      )
      toast.success('Task deleted successfully')
    } else {
      toast.error('Error deleting task, please retry later.')
    }
  }

  return (
    <div className="flex min-w-0 flex-col font-black text-sm w-full z-20">
      {assignmentTaskState.assignmentTask &&
        Object.keys(assignmentTaskState.assignmentTask).length > 0 && (
          <div className="flex min-w-0 flex-col space-y-3">
            <div className="flex flex-col bg-white px-4 text-sm tracking-tight z-10 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] pt-5 mb-3 nice-shadow sm:px-6 lg:px-10">
              <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 truncate font-semibold text-lg">
                  {assignmentTaskState?.assignmentTask.title}
                </div>
                <div className="shrink-0">
                  <div
                    onClick={() => deleteTaskUI()}
                    className="flex min-h-10 cursor-pointer items-center justify-center space-x-2 rounded-md border border-rose-600/10 bg-linear-to-bl bg-rose-100 px-3 py-1.5 text-red-800 shadow-lg shadow-rose-900/10"
                  >
                    <Trash size={18} />
                    <p className="text-xs font-semibold">Delete Task</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                <div
                  onClick={() => setSelectedSubPage('general')}
                  className={`flex shrink-0 py-2 text-center border-black transition-all ease-linear ${
                    selectedSubPage === 'general' ? 'border-b-4' : 'opacity-50'
                  } cursor-pointer`}
                >
                  <div className="flex items-center space-x-2.5 mx-2">
                    <Info size={16} />
                    <div>General</div>
                  </div>
                </div>
                <div
                  onClick={() => setSelectedSubPage('content')}
                  className={`flex shrink-0 py-2 text-center border-black transition-all ease-linear ${
                    selectedSubPage === 'content' ? 'border-b-4' : 'opacity-50'
                  } cursor-pointer`}
                >
                  <div className="flex items-center space-x-2.5 mx-2">
                    <GalleryVerticalEnd size={16} />
                    <div>Content</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto mt-4 w-full max-w-[95%] bg-white rounded-xl shadow-xs px-3 py-4 nice-shadow overflow-hidden min-w-0 sm:px-6 sm:py-5 lg:mt-10 lg:max-w-5xl">
              {selectedSubPage === 'general' && <AssignmentTaskGeneralEdit />}
              {selectedSubPage === 'content' && <AssignmentTaskContentEdit />}
            </div>
          </div>
        )}
      {Object.keys(assignmentTaskState.assignmentTask).length == 0 && (
        <div className="flex flex-col h-full bg-white px-4 text-sm tracking-tight z-10 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] pt-5 sm:px-6 lg:px-10">
          <div className="flex justify-center items-center h-full text-gray-300 antialiased">
            <div className="flex flex-col space-y-2 items-center">
              <TentTree size={60} />
              <div className="font-semibold text-2xl py-1">
                No Task Selected
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AssignmentTaskEditor
