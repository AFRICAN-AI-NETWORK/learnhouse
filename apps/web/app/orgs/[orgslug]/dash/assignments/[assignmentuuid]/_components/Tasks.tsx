import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import {
  Code,
  FileUp,
  Link as LinkIcon,
  ListTodo,
  PanelLeftOpen,
  Plus,
  Type,
} from 'lucide-react'
import React, { useEffect } from 'react'
import NewTaskModal from './Modals/NewTaskModal'
import {
  useAssignmentsTask,
  useAssignmentsTaskDispatch,
} from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useTranslation } from 'react-i18next'

function AssignmentTasks({ assignment_uuid }: any) {
  const { t } = useTranslation()
  const assignments = useAssignments() as any
  const assignmentTask = useAssignmentsTask() as any
  const assignmentTaskHook = useAssignmentsTaskDispatch() as any
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = React.useState(false)

  async function setSelectTask(task_uuid: string) {
    assignmentTaskHook({
      type: 'setSelectedAssignmentTaskUUID',
      payload: task_uuid,
    })
  }

  useEffect(() => {}, [assignments])

  return (
    <div className="flex w-full min-w-0 px-4 pb-4 lg:px-0">
      <div className="mx-auto flex w-full min-w-0 flex-row gap-3 overflow-x-auto pb-2 lg:w-auto lg:flex-col lg:space-y-3 lg:overflow-visible lg:pb-0">
        {assignments && assignments?.assignment_tasks?.length < 100 && (
          <Modal
            isDialogOpen={isNewTaskModalOpen}
            onOpenChange={setIsNewTaskModalOpen}
            minHeight="sm"
            minWidth="sm"
            dialogContent={
              <NewTaskModal
                assignment_uuid={assignment_uuid}
                closeModal={setIsNewTaskModalOpen}
              />
            }
            dialogTitle={t('dashboard.assignments.editor.add_task_modal.title')}
            dialogDescription={t(
              'dashboard.assignments.editor.add_task_modal.description'
            )}
            dialogTrigger={
              <div className="flex min-h-[44px] min-w-[180px] shrink-0 items-center justify-center space-x-1.5 rounded-md bg-black px-3 py-2 text-xs font-semibold text-white antialiased cursor-pointer lg:min-w-0">
                <Plus size={17} />
                <p>{t('dashboard.assignments.editor.add_task')}</p>
              </div>
            }
          />
        )}
        {assignments &&
          assignments?.assignment_tasks?.map((task: any) => {
            return (
              <div
                key={task.id}
                className="flex min-h-[44px] w-[240px] shrink-0 flex-col rounded-md bg-white p-3 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] nice-shadow lg:w-[250px]"
                onClick={() => setSelectTask(task.assignment_task_uuid)}
              >
                <div className="flex items-center justify-between gap-2 px-2">
                  <div className="flex min-w-0 items-center space-x-3">
                    <div className="text-gray-500">
                      {task.assignment_type === 'QUIZ' && (
                        <ListTodo size={15} />
                      )}
                      {task.assignment_type === 'FILE_SUBMISSION' && (
                        <FileUp size={15} />
                      )}
                      {task.assignment_type === 'FORM' && <Type size={15} />}
                      {task.assignment_type === 'CODE_EDITOR' && (
                        <Code size={15} />
                      )}
                      {task.assignment_type === 'LINK_SUBMISSION' && (
                        <LinkIcon size={15} />
                      )}
                    </div>
                    <div className="min-w-0 truncate text-sm font-semibold">
                      {task.title}
                    </div>
                  </div>
                  <button
                    className={`outline-1 outline-gray-200 ${task.assignment_task_uuid == assignmentTask.selectedAssignmentTaskUUID ? 'bg-slate-100' : ''} hover:bg-slate-100/50 rounded-md text-gray-500 font-bold py-2 px-3 ease-linear transition-all shrink-0`}
                  >
                    <PanelLeftOpen size={16} />
                  </button>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default AssignmentTasks
