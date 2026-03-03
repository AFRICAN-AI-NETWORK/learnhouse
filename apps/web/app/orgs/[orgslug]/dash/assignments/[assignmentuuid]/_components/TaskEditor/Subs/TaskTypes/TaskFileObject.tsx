import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import { useAssignmentsTaskDispatch } from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import AssignmentBoxUI from '@components/Objects/Activities/Assignment/AssignmentBoxUI'
import {
  getAssignmentTask,
  getAssignmentTaskSubmissionsMe,
  getAssignmentTaskSubmissionsUser,
  handleAssignmentTaskSubmission,
  updateSubFile,
} from '@services/courses/assignments'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { getTaskFileSubmissionDir } from '@services/media/media'
import { Cloud, Download, File, Info, Loader, UploadCloud } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

type FileSchema = {
  fileUUID: string
  assignment_task_submission_uuid?: string
}

type TaskFileObjectProps = {
  view: 'teacher' | 'student' | 'grading' | 'custom-grading'
  assignmentTaskUUID?: string
  user_id?: string
  isFocusMode?: boolean
}

export default function TaskFileObject({
  view,
  user_id,
  assignmentTaskUUID,
  isFocusMode = false,
}: TaskFileObjectProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const access_token = session?.data?.tokens?.access_token
  const [isLoading, setIsLoading] = React.useState(false)
  const [localUploadFile, setLocalUploadFile] = React.useState<File | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(null)
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any

  // Helper to get consistent keys for SWR
  const getKey = (type: string) => {
    if (!access_token || !assignmentTaskUUID) return null
    const assignmentUUID = assignment.assignment_object.assignment_uuid

    if (type === 'task') return [`tasks/${assignmentTaskUUID}`, access_token]
    if (type === 'submission_student')
      return [
        `tasks/${assignmentTaskUUID}/my-submission`,
        access_token,
        assignmentUUID,
      ]
    if (type === 'submission_grading' && user_id)
      return [
        `tasks/${assignmentTaskUUID}/users/${user_id}/submission`,
        access_token,
        assignmentUUID,
      ]
    return null
  }

  // Fetch Task
  const { data: fetchTaskRes } = useSWR(
    view === 'student' || view === 'custom-grading' ? getKey('task') : null,
    ([url, token]) => getAssignmentTask(assignmentTaskUUID!, token)
  )
  const assignmentTask = fetchTaskRes?.data
  const assignmentTaskOutsideProvider = assignmentTask

  // Fetch Submission (Student)
  const { data: fetchSubStudentRes, mutate: mutateStudentSub } = useSWR(
    view === 'student' ? getKey('submission_student') : null,
    ([url, token, assignUUID]) =>
      getAssignmentTaskSubmissionsMe(assignmentTaskUUID!, assignUUID, token)
  )

  // Fetch Submission (Grading)
  const { data: fetchSubGradingRes, mutate: mutateGradingSub } = useSWR(
    view === 'custom-grading' ? getKey('submission_grading') : null,
    ([url, token, assignUUID]) =>
      getAssignmentTaskSubmissionsUser(
        assignmentTaskUUID!,
        user_id!,
        assignUUID,
        token
      )
  )

  // Derived userSubmissions
  const submissionData =
    view === 'student' ? fetchSubStudentRes?.data : fetchSubGradingRes?.data
  const userSubmissions = submissionData?.task_submission || { fileUUID: '' }
  const userSubmissionObject = submissionData

  // Derived initial state (using SWR data as 'saved' state implies initial == current after fetch)
  const initialUserSubmissions = userSubmissions

  const handleFileChange = async (event: any) => {
    // Check if user is authenticated
    if (!access_token) {
      setError(
        t('dashboard.assignments.editor.task_editor.general.auth_required')
      )
      return
    }

    const file = event.target.files[0]

    setLocalUploadFile(file)
    setIsLoading(true)
    const res = await updateSubFile(
      file,
      assignmentTask.assignment_task_uuid,
      assignment.assignment_object.assignment_uuid,
      access_token
    )

    // wait for 1 second to show loading animation
    await new Promise((r) => setTimeout(r, 1500))
    if (res.success === false) {
      setError(res.data.detail)
      setIsLoading(false)
    } else {
      assignmentTaskStateHook({ type: 'reload' })
      await mutateStudentSub()

      // Mutate task submissions list to update activity-level UI
      mutate(
        `${getAPIUrl()}assignments/${assignment.assignment_object.assignment_uuid}/tasks/submissions/me`
      )

      setIsLoading(false)
      setError('')
      setLocalUploadFile(null) // Reset local file after success
    }
  }

  const submitFC = async () => {
    // Check if user is authenticated
    if (!access_token) {
      toast.error(
        t(
          'dashboard.assignments.editor.task_editor.general.auth_required_submit'
        )
      )
      return
    }

    // Save the file submission to the server
    const values = {
      assignment_task_submission_uuid:
        userSubmissions.assignment_task_submission_uuid || null,
      task_submission: userSubmissions,
      grade: 0,
      task_submission_grade_feedback: '',
    }
    if (assignmentTaskUUID) {
      const res = await handleAssignmentTaskSubmission(
        values,
        assignmentTaskUUID,
        assignment.assignment_object.assignment_uuid,
        access_token
      )
      if (res) {
        assignmentTaskStateHook({ type: 'reload' })
        toast.success(t('dashboard.assignments.editor.toasts.task_saved'))
        mutateStudentSub()

        // Mutate task submissions list to update activity-level UI
        mutate(
          `${getAPIUrl()}assignments/${assignment.assignment_object.assignment_uuid}/tasks/submissions/me`
        )
      } else {
        toast.error(t('dashboard.assignments.editor.toasts.task_save_error'))
      }
    }
  }

  const gradeCustomFC = async (grade: number) => {
    if (assignmentTaskUUID) {
      if (grade > (assignmentTaskOutsideProvider?.max_grade_value || 100)) {
        toast.error(
          `Grade cannot be more than ${assignmentTaskOutsideProvider?.max_grade_value} points`
        )
        return
      }

      // Save the grade to the server
      const values = {
        assignment_task_submission_uuid:
          userSubmissions.assignment_task_submission_uuid,
        task_submission: userSubmissions,
        grade: grade,
        task_submission_grade_feedback:
          'Graded by teacher : @' + session.data.user.username,
      }

      const res = await handleAssignmentTaskSubmission(
        values,
        assignmentTaskUUID,
        assignment.assignment_object.assignment_uuid,
        access_token
      )
      if (res) {
        mutateGradingSub()
        toast.success(`Task graded successfully with ${grade} points`)
      } else {
        toast.error('Error grading task, please retry later.')
      }
    }
  }

  // Logic simplified as upload is immediate
  const showSavingDisclaimer = false

  return (
    <AssignmentBoxUI
      submitFC={submitFC}
      showSavingDisclaimer={showSavingDisclaimer}
      view={view}
      gradeCustomFC={gradeCustomFC}
      currentPoints={userSubmissionObject?.grade}
      maxPoints={assignmentTaskOutsideProvider?.max_grade_value}
      type="file"
      isFocusMode={isFocusMode}
    >
      {view === 'teacher' && (
        <div className="flex flex-col sm:flex-row py-5 sm:py-6 text-xs sm:text-sm justify-center mx-auto space-y-2 sm:space-y-0 sm:space-x-3 text-slate-600 px-4 sm:px-2 text-center sm:text-left bg-slate-50 rounded-lg border border-slate-100">
          <Info size={18} className="mx-auto sm:mx-0 text-slate-500" />
          <p>
            User will be able to submit a file for this task, you'll be able to
            review it in the Submissions Tab
          </p>
        </div>
      )}
      {view === 'custom-grading' && (
        <div className="flex flex-col space-y-4 w-full px-2 sm:px-0">
          <div className="flex flex-col sm:flex-row py-5 sm:py-6 text-xs sm:text-sm justify-center mx-auto space-y-2 sm:space-y-0 sm:space-x-3 text-slate-600 px-4 sm:px-2 text-center sm:text-left bg-slate-50 rounded-lg border border-slate-100">
            <Download size={18} className="mx-auto sm:mx-0 text-slate-500" />
            <p>
              Please download the file and grade it manually, then input the
              grade above
            </p>
          </div>
          {userSubmissions.fileUUID && !isLoading && assignmentTaskUUID && (
            <Link
              href={getTaskFileSubmissionDir(
                org?.org_uuid,
                assignment.course_object.course_uuid,
                assignment.activity_object.activity_uuid,
                assignment.assignment_object.assignment_uuid,
                assignmentTaskUUID,
                userSubmissions.fileUUID
              )}
              target="_blank"
              className="flex flex-col rounded-lg bg-white text-gray-500 shadow-xs hover:shadow-md transition-shadow border border-gray-100 px-4 sm:px-5 py-4 space-y-1 items-center relative w-full sm:w-auto mx-auto"
            >
              <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-emerald-500 rounded-full p-1.5 text-white flex justify-center items-center shadow-xs">
                <Cloud size={14} />
              </div>

              <div className="flex space-x-2 mt-2 items-center">
                <File size={18} className="text-emerald-500" />
                <div className="font-medium text-xs sm:text-sm uppercase break-all">
                  {`${userSubmissions.fileUUID.slice(0, 8)}...${userSubmissions.fileUUID.slice(-4)}`}
                </div>
              </div>
            </Link>
          )}
        </div>
      )}
      {view === 'student' && (
        <>
          <div
            className={`w-full rounded-lg border min-h-[200px] shadow-xs px-4 sm:px-6 py-5 sm:py-6 ${isFocusMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}
          >
            <div className="flex flex-col justify-center items-center h-full w-full">
              <div className="flex flex-col justify-center items-center w-full max-w-full">
                <div className="flex flex-col justify-center items-center w-full">
                  {error && (
                    <div className="flex justify-center bg-red-50 border border-red-100 rounded-md text-red-600 space-x-2 items-center p-3 transition-all shadow-xs w-full sm:w-auto mb-4">
                      <div className="text-xs sm:text-sm font-medium">
                        {error}
                      </div>
                    </div>
                  )}
                </div>
                {localUploadFile && !isLoading && (
                  <div className="flex flex-col rounded-lg bg-white text-gray-500 shadow-xs border border-gray-100 px-4 sm:px-5 py-4 space-y-1 items-center relative w-full sm:w-auto mt-3">
                    <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-emerald-500 rounded-full p-1.5 text-white flex justify-center items-center shadow-xs">
                      <Cloud size={14} />
                    </div>

                    <div className="flex space-x-2 mt-2 items-center">
                      <File size={18} className="text-emerald-500" />
                      <div className="font-medium text-xs sm:text-sm uppercase break-all">
                        {localUploadFile.name.length > 20
                          ? `${localUploadFile.name.slice(0, 10)}...${localUploadFile.name.slice(-10)}`
                          : localUploadFile.name}
                      </div>
                    </div>
                  </div>
                )}
                {userSubmissions.fileUUID && !isLoading && !localUploadFile && (
                  <div
                    className={`flex flex-col rounded-lg shadow-xs border px-4 sm:px-5 py-4 space-y-1 items-center relative w-full sm:w-auto mt-3 ${isFocusMode ? 'bg-white/10 border-white/10 text-zinc-300' : 'bg-white border-gray-100 text-gray-500'}`}
                  >
                    <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-emerald-500 rounded-full p-1.5 text-white flex justify-center items-center shadow-xs">
                      <Cloud size={14} />
                    </div>

                    <div className="flex space-x-2 mt-2 items-center">
                      <File size={18} className="text-emerald-500" />
                      <div className="font-medium text-xs sm:text-sm uppercase break-all">
                        {`${userSubmissions.fileUUID.slice(0, 8)}...${userSubmissions.fileUUID.slice(-4)}`}
                      </div>
                    </div>
                  </div>
                )}
                <div
                  className={`flex flex-col sm:flex-row pt-5 font-medium space-y-1 sm:space-y-0 sm:space-x-2 text-xs items-center text-center sm:text-left rounded-lg px-3 py-2 mt-5 border w-full sm:w-auto ${isFocusMode ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                >
                  <Info
                    size={15}
                    className={`mx-auto sm:mx-0 ${isFocusMode ? 'text-zinc-500' : 'text-slate-400'}`}
                  />
                  <p>
                    {t(
                      'dashboard.assignments.editor.task_editor.general.allowed_formats'
                    )}
                  </p>
                </div>
                {!access_token ? (
                  <div className="flex justify-center items-center w-full mt-5">
                    <div className="flex justify-center bg-amber-50 border border-amber-100 rounded-md text-amber-600 space-x-2 items-center p-3 transition-all shadow-xs w-full sm:w-auto">
                      <Info size={15} className="text-amber-500" />
                      <div className="text-xs sm:text-sm font-medium">
                        {t(
                          'dashboard.assignments.editor.task_editor.general.sign_in_required'
                        )}
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  <div className="flex justify-center items-center w-full mt-5">
                    <input
                      type="file"
                      id="fileInput"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <div className="font-medium animate-pulse antialiased items-center bg-slate-100 text-slate-600 text-xs sm:text-sm rounded-md px-4 sm:px-5 py-2.5 flex">
                      <Loader size={15} className="mr-2" />
                      <span>Loading</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center items-center w-full mt-5">
                    <input
                      type="file"
                      id={'fileInput_' + assignmentTaskUUID}
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <button
                      className="font-medium antialiased items-center text-white text-xs sm:text-sm rounded-md px-4 sm:px-5 py-2.5 flex bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-xs"
                      onClick={() =>
                        document
                          .getElementById('fileInput_' + assignmentTaskUUID)
                          ?.click()
                      }
                    >
                      <UploadCloud size={15} className="mr-2" />
                      <span>Submit File</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AssignmentBoxUI>
  )
}
