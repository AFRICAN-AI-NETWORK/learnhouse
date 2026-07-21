import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import { BookOpenCheck, Download, Info, MoveRight, X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import TaskQuizObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskQuizObject'
import TaskFileObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskFileObject'
import TaskFormObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskFormObject'
import TaskCodeEditorObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskCodeEditorObject'
import TaskLinkObject from '../../_components/TaskEditor/Subs/TaskTypes/TaskLinkObject'
import { useOrg } from '@components/Contexts/OrgContext'
import { getTaskRefFileDir } from '@services/media/media'
import {
  markActivityAsDoneForUser,
  putFinalGrade,
  requestAssignmentRevision,
} from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

function EvaluateAssignment({ user_id }: any) {
  const { t } = useTranslation()
  const assignments = useAssignments() as any
  const session = useLHSession() as any
  const org = useOrg() as any
  const [revisionFeedback, setRevisionFeedback] = React.useState('')
  const [gradeFeedback, setGradeFeedback] = React.useState('')

  async function gradeAssignment(showToast = true) {
    const res = await putFinalGrade(
      user_id,
      assignments?.assignment_object.assignment_uuid,
      session.data?.tokens?.access_token,
      gradeFeedback
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
    const res = await requestAssignmentRevision(
      { submission_feedback: revisionFeedback },
      user_id,
      assignments?.assignment_object.assignment_uuid,
      session.data?.tokens?.access_token
    )
    if (res.success) {
      toast.success(
        t('dashboard.assignments.submissions.toasts.reject_success')
      )
      window.location.reload()
    } else {
      toast.error(
        res.data?.detail ||
          t('dashboard.assignments.submissions.toasts.reject_failed')
      )
    }
  }

  return (
    <div className="flex max-w-full flex-col space-y-6 overflow-y-auto px-3 py-6 sm:px-4 sm:py-8">
      {assignments &&
        assignments?.assignment_tasks
          ?.sort((a: any, b: any) => a.id - b.id)
          .map((task: any, index: number) => {
            return (
              <div
                className="flex flex-col space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6"
                key={task.assignment_task_uuid}
              >
                <div className="flex flex-col gap-3 border-b border-slate-50 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Task {index + 1}
                      </span>
                      <h4 className="min-w-0 truncate font-bold tracking-tight text-slate-800">
                        {task.description}
                      </h4>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                  {task.assignment_type === 'LINK_SUBMISSION' && (
                    <TaskLinkObject
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
      <div className="-mx-3 mt-4 flex flex-col gap-4 rounded-b-xl border-t bg-slate-50/50 px-4 pt-6 font-semibold sm:-mx-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-col gap-2 lg:max-w-[320px]">
          <textarea
            value={revisionFeedback}
            onChange={(e) => setRevisionFeedback(e.target.value)}
            placeholder={t(
              'dashboard.assignments.submissions.revision_feedback_placeholder'
            )}
            className="min-h-[74px] w-full resize-none rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-300"
          />
          <button
            onClick={rejectAssignment}
            className="flex min-h-11 items-center justify-center space-x-2 rounded-xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-bold text-rose-600 transition-colors cursor-pointer nice-shadow hover:bg-rose-50"
          >
            <X size={18} />
            <span>{t('dashboard.assignments.submissions.actions.reject')}</span>
          </button>
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-[320px]">
          <textarea
            value={gradeFeedback}
            onChange={(e) => setGradeFeedback(e.target.value)}
            placeholder={t(
              'dashboard.assignments.submissions.grade_feedback_placeholder'
            )}
            className="min-h-[74px] w-full resize-none rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-300"
          />
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Manual Flow
            </span>
            <span className="text-xs">Grade</span>
            <MoveRight size={14} className="opacity-40" />
            <span className="text-xs">Done</span>
          </div>
        </div>
        <div className="flex w-full sm:justify-end lg:w-auto">
          <button
            onClick={gradeAndComplete}
            className="flex min-h-11 w-full items-center justify-center space-x-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition-all cursor-pointer hover:scale-[1.02] hover:shadow-indigo-200 active:scale-[0.98] lg:w-auto"
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
