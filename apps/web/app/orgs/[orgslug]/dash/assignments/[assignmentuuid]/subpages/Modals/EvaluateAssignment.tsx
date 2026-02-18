import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import { BookOpenCheck, Download, Info, MoveRight, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import TaskQuizObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskQuizObject'
import TaskFileObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskFileObject'
import TaskFormObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskFormObject'
import TaskCodeEditorObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskCodeEditorObject'
import { useOrg } from '@components/Contexts/OrgContext'
import { getTaskRefFileDir } from '@services/media/media'
import {
  deleteUserSubmission,
  markActivityAsDoneForUser,
  putFinalGrade,
} from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

function EvaluateAssignment({ user_id }: any) {
  const { t } = useTranslation()
  const assignments = useAssignments() as any
  const session = useLHSession() as any
  const org = useOrg() as any

  async function gradeAssignment(showToast = true) {
    const res = await putFinalGrade(
      user_id,
      assignments?.assignment_object.assignment_uuid,
      session.data?.tokens?.access_token
    )
    if (showToast) {
      if (res.success) toast.success(res.data.message)
      else toast.error(res.data.message)
    }
    return res
  }

  async function markActivityAsDone(showToast = true) {
    const res = await markActivityAsDoneForUser(
      user_id,
      assignments?.assignment_object.assignment_uuid,
      session.data?.tokens?.access_token
    )
    if (showToast) {
      if (res.success) toast.success(res.data.message)
      else toast.error(res.data.message)
    }
    return res
  }

  async function gradeAndComplete() {
    const gradeRes = await gradeAssignment(false)
    if (gradeRes.success) {
      const doneRes = await markActivityAsDone(false)
      if (doneRes.success) {
        toast.success(
          t('dashboard.assignments.submissions.toasts.grade_complete_success')
        )
        window.location.reload()
      } else {
        toast.error(
          t(
            'dashboard.assignments.submissions.toasts.grade_success_done_failed'
          )
        )
      }
    } else {
      toast.error(t('dashboard.assignments.submissions.toasts.grade_failed'))
    }
  }

  async function rejectAssignment() {
    const res = await deleteUserSubmission(
      user_id,
      assignments?.assignment_object.assignment_uuid,
      session.data?.tokens?.access_token
    )
    toast.success(t('dashboard.assignments.submissions.toasts.reject_success'))
    window.location.reload()
  }

  return (
    <div className="flex flex-col space-y-6 px-4 py-8 overflow-y-auto">
      {assignments &&
        assignments?.assignment_tasks
          ?.sort((a: any, b: any) => a.id - b.id)
          .map((task: any, index: number) => {
            return (
              <div
                className="flex flex-col space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm"
                key={task.assignment_task_uuid}
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Task {index + 1}
                      </span>
                      <h4 className="font-bold text-slate-800 tracking-tight">
                        {task.description}
                      </h4>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {task.hint && (
                      <div
                        onClick={() => alert(task.hint)}
                        className="px-3 py-1.5 flex items-center bg-amber-50 text-amber-700 rounded-xl space-x-2 cursor-pointer border border-amber-100/50 hover:bg-amber-100 transition-colors"
                      >
                        <Info size={13} />
                        <p className="text-xs font-bold">
                          {t('dashboard.assignments.submissions.hint')}
                        </p>
                      </div>
                    )}
                    {task.reference_file && (
                      <Link
                        href={getTaskRefFileDir(
                          org?.org_uuid,
                          assignments?.course_object.course_uuid,
                          assignments?.activity_object.activity_uuid,
                          assignments?.assignment_object.assignment_uuid,
                          task.assignment_task_uuid,
                          task.reference_file
                        )}
                        target="_blank"
                        download={true}
                        className="px-3 py-1.5 flex items-center bg-cyan-50 text-cyan-700 rounded-xl space-x-2 cursor-pointer border border-cyan-100/50 hover:bg-cyan-100 transition-colors"
                      >
                        <Download size={13} />
                        <div className="flex items-center space-x-2">
                          <span className="relative">
                            <span className="absolute right-0 top-0 block h-1.5 w-1.5 rounded-full ring-2 ring-white bg-green-400"></span>
                          </span>
                          <p className="text-xs font-bold">
                            {t(
                              'dashboard.assignments.submissions.reference_document'
                            )}
                          </p>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="min-h-full">
                  {task.assignment_type === 'QUIZ' && (
                    <TaskQuizObject
                      key={task.assignment_task_uuid}
                      view="grading"
                      user_id={user_id}
                      assignmentTaskUUID={task.assignment_task_uuid}
                    />
                  )}
                  {task.assignment_type === 'FILE_SUBMISSION' && (
                    <TaskFileObject
                      key={task.assignment_task_uuid}
                      view="custom-grading"
                      user_id={user_id}
                      assignmentTaskUUID={task.assignment_task_uuid}
                    />
                  )}
                  {task.assignment_type === 'FORM' && (
                    <TaskFormObject
                      key={task.assignment_task_uuid}
                      view="grading"
                      user_id={user_id}
                      assignmentTaskUUID={task.assignment_task_uuid}
                    />
                  )}
                  {task.assignment_type === 'CODE_EDITOR' && (
                    <TaskCodeEditorObject
                      key={task.assignment_task_uuid}
                      view="custom-grading"
                      user_id={user_id}
                      assignmentTaskUUID={task.assignment_task_uuid}
                    />
                  )}
                </div>
              </div>
            )
          })}
      <div className="flex space-x-4 font-semibold items-center justify-between border-t pt-6 bg-slate-50/50 -mx-4 px-8 mt-4 rounded-b-xl">
        <button
          onClick={rejectAssignment}
          className="flex space-x-2 px-5 py-2.5 text-sm bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors nice-shadow items-center cursor-pointer font-bold"
        >
          <X size={18} />
          <span>{t('dashboard.assignments.submissions.actions.reject')}</span>
        </button>
        <div className="flex space-x-4 items-center">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Manual Flow
            </span>
            <div className="flex items-center space-x-2 text-slate-500">
              <span className="text-xs">Grade</span>
              <MoveRight size={14} className="opacity-40" />
              <span className="text-xs">Done</span>
            </div>
          </div>
          <button
            onClick={gradeAndComplete}
            className="flex space-x-2 px-6 py-3 text-sm bg-linear-to-r from-violet-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all items-center cursor-pointer font-bold"
          >
            <BookOpenCheck size={18} />
            <span>
              {t(
                'dashboard.assignments.submissions.actions.grade_and_complete'
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default EvaluateAssignment
