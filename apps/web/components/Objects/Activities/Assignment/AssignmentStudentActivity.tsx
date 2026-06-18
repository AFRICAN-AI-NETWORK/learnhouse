import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import { useCourse } from '@components/Contexts/CourseContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getTaskRefFileDir } from '@services/media/media'
import TaskFileObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskFileObject'
import TaskQuizObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskQuizObject'
import TaskFormObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskFormObject'
import TaskCodeEditorObject from 'app/orgs/[orgslug]/dash/assignments/[assignmentuuid]/_components/TaskEditor/Subs/TaskTypes/TaskCodeEditorObject'
import {
  Backpack,
  Calendar,
  Download,
  EllipsisVertical,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

function AssignmentStudentActivity({
  isFocusMode = false,
}: {
  isFocusMode?: boolean
}) {
  const { t } = useTranslation()
  const assignments = useAssignments() as any
  const course = useCourse() as any
  const org = useOrg() as any

  useEffect(() => {}, [assignments, org])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col space-y-3 px-3 py-4 md:space-y-6 md:px-6 md:py-8">
      <div className="flex flex-col items-stretch justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:space-x-3 md:border-0 md:bg-transparent md:px-0 md:py-0 dark:border-white/8 dark:bg-white/5 md:dark:bg-transparent">
        <div className="text-xs h-fit flex space-x-3 items-center">
          <div
            className={`flex h-fit items-center gap-2 rounded-md px-3 py-2 text-sm md:rounded-full md:px-5 ${isFocusMode ? 'bg-white/5 text-zinc-300 border border-white/10' : 'text-slate-700 bg-slate-100/5 md:nice-shadow'}`}
          >
            <Backpack size={14} className="md:size-[14px]" />
            <p className="font-semibold">{t('activities.assignment')}</p>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <EllipsisVertical
              className="text-slate-400 hidden md:block"
              size={18}
            />
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 text-xs md:space-x-2 ${isFocusMode ? 'text-zinc-300' : 'text-slate-500 md:text-slate-400'}`}
              >
                <Calendar size={14} />
                <p
                  className={`font-semibold ${isFocusMode ? 'text-zinc-300' : 'text-slate-400'}`}
                >
                  {t('assignments.due_date')}
                </p>
                <p
                  className={`font-semibold ${isFocusMode ? 'text-zinc-100' : 'text-slate-400'}`}
                >
                  {assignments?.assignment_object?.due_date}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {assignments?.assignment_object?.description && (
        <div
          className={`flex flex-col space-y-2 rounded-md p-4 md:p-6 ${isFocusMode ? 'bg-white/5 border border-white/10' : 'border border-slate-200 bg-white md:nice-shadow md:border-0 md:bg-slate-100/30'}`}
        >
          <div className="flex flex-col space-y-3">
            <div
              className={`flex items-center gap-2 ${isFocusMode ? 'text-white' : 'text-slate-700'}`}
            >
              <Info
                size={16}
                className={`${isFocusMode ? 'text-zinc-300' : 'text-slate-500'}`}
              />
              <h3
                className={`text-sm font-semibold ${isFocusMode ? 'text-white' : 'text-slate-700'}`}
              >
                {t('assignments.assignment_description')}
              </h3>
            </div>
            <div className="pl-6">
              <p
                className={`text-sm leading-relaxed font-medium ${isFocusMode ? 'text-zinc-100' : 'text-slate-600'}`}
              >
                {assignments.assignment_object.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {assignments &&
        assignments?.assignment_tasks
          ?.sort((a: any, b: any) => a.id - b.id)
          .map((task: any, index: number) => {
            return (
              <div
                className="flex flex-col space-y-2"
                key={task.assignment_task_uuid}
              >
                <div className="flex flex-col gap-3 py-3 md:flex-row md:justify-between md:gap-4 md:space-y-0">
                  <div
                    className={`flex min-w-0 flex-col gap-1 font-semibold md:flex-row md:flex-wrap md:space-x-2 ${isFocusMode ? 'text-white' : 'text-slate-800'}`}
                  >
                    <p
                      className={`${isFocusMode ? 'text-white' : 'text-slate-700'} transition-colors`}
                    >
                      {t('assignments.task')} {index + 1} :{' '}
                    </p>
                    <p
                      className={`${isFocusMode ? 'text-zinc-100' : 'text-slate-500'} wrap-break-word transition-colors`}
                    >
                      {task.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                    <div
                      onClick={() => alert(task.hint)}
                      aria-label={t('assignments.hint')}
                      className={`flex h-9 cursor-pointer items-center justify-center rounded-md px-3 transition-all hover:scale-105 active:scale-95 md:h-auto md:rounded-full md:py-1 md:nice-shadow ${isFocusMode ? 'bg-amber-400/10 border border-amber-400/20 text-amber-300' : 'bg-amber-50 text-amber-900 md:bg-amber-50/40'}`}
                    >
                      <Info size={13} />
                      <p className="ml-2 hidden text-xs font-bold uppercase tracking-wider sm:block">
                        {t('assignments.hint')}
                      </p>
                    </div>
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
                      aria-label={t('assignments.reference_document')}
                      className={`flex h-9 cursor-pointer items-center justify-center rounded-md px-3 transition-all hover:scale-105 active:scale-95 md:h-auto md:rounded-full md:py-1 md:nice-shadow ${isFocusMode ? 'bg-cyan-400/10 border border-cyan-400/20 text-cyan-300' : 'bg-cyan-50 text-cyan-900 md:bg-cyan-50/40'}`}
                    >
                      <Download size={13} />
                      <div className="flex items-center space-x-1 md:space-x-2">
                        {task.reference_file && (
                          <span className="relative">
                            <span
                              className={`absolute right-0 top-0 block h-2 w-2 rounded-full ring-2 ${isFocusMode ? 'ring-cyan-900/50' : 'ring-white'} bg-green-400`}
                            ></span>
                          </span>
                        )}
                        <p className="hidden text-xs font-bold uppercase tracking-wider sm:block">
                          {t('assignments.reference_document')}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
                <div className="w-full min-w-0">
                  {task.assignment_type === 'QUIZ' && (
                    <TaskQuizObject
                      key={task.assignment_task_uuid}
                      view="student"
                      assignmentTaskUUID={task.assignment_task_uuid}
                      isFocusMode={isFocusMode}
                    />
                  )}
                  {task.assignment_type === 'FILE_SUBMISSION' && (
                    <TaskFileObject
                      key={task.assignment_task_uuid}
                      view="student"
                      assignmentTaskUUID={task.assignment_task_uuid}
                      isFocusMode={isFocusMode}
                    />
                  )}
                  {task.assignment_type === 'FORM' && (
                    <TaskFormObject
                      key={task.assignment_task_uuid}
                      view="student"
                      assignmentTaskUUID={task.assignment_task_uuid}
                      isFocusMode={isFocusMode}
                    />
                  )}
                  {task.assignment_type === 'CODE_EDITOR' && (
                    <TaskCodeEditorObject
                      key={task.assignment_task_uuid}
                      view="student"
                      assignmentTaskUUID={task.assignment_task_uuid}
                      isFocusMode={isFocusMode}
                    />
                  )}
                </div>
              </div>
            )
          })}
    </div>
  )
}

export default AssignmentStudentActivity
