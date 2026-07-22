import {
  useAssignmentsTask,
  useAssignmentsTaskDispatch,
} from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import React, { useEffect } from 'react'
import TaskQuizObject from './TaskTypes/TaskQuizObject'
import TaskFileObject from './TaskTypes/TaskFileObject'
import TaskFormObject from './TaskTypes/TaskFormObject'
import TaskCodeEditorObject from './TaskTypes/TaskCodeEditorObject'
import TaskLinkObject from './TaskTypes/TaskLinkObject'

function AssignmentTaskContentEdit() {
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment_task = useAssignmentsTask() as any

  useEffect(() => {}, [assignment_task, assignmentTaskStateHook])

  return (
    <div className="w-full max-w-full overflow-hidden">
      {assignment_task?.assignmentTask.assignment_type === 'QUIZ' && (
        <TaskQuizObject
          key={assignment_task?.assignmentTask.assignment_task_uuid}
          view="teacher"
        />
      )}
      {assignment_task?.assignmentTask.assignment_type ===
        'FILE_SUBMISSION' && (
        <TaskFileObject
          key={assignment_task?.assignmentTask.assignment_task_uuid}
          view="teacher"
        />
      )}
      {assignment_task?.assignmentTask.assignment_type === 'FORM' && (
        <TaskFormObject
          key={assignment_task?.assignmentTask.assignment_task_uuid}
          view="teacher"
          assignmentTaskUUID={
            assignment_task?.assignmentTask.assignment_task_uuid
          }
        />
      )}
      {assignment_task?.assignmentTask.assignment_type === 'CODE_EDITOR' && (
        <TaskCodeEditorObject
          key={assignment_task?.assignmentTask.assignment_task_uuid}
          view="teacher"
        />
      )}
      {assignment_task?.assignmentTask.assignment_type ===
        'LINK_SUBMISSION' && (
        <TaskLinkObject
          key={assignment_task?.assignmentTask.assignment_task_uuid}
          view="teacher"
        />
      )}
    </div>
  )
}

export default AssignmentTaskContentEdit
