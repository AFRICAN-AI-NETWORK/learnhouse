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
import {
  Cloud,
  Download,
  File,
  Info,
  Loader,
  Trash2,
  UploadCloud,
} from 'lucide-react'
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
  const [uploadSuccess, setUploadSuccess] = React.useState(false)
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any

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

  const { data: fetchTaskRes } = useSWR(
    view === 'student' || view === 'custom-grading' ? getKey('task') : null,
    ([url, token]) => getAssignmentTask(assignmentTaskUUID!, token)
  )
  const assignmentTask = fetchTaskRes?.data
  const assignmentTaskOutsideProvider = assignmentTask

  const { data: fetchSubStudentRes, mutate: mutateStudentSub } = useSWR(
    view === 'student' ? getKey('submission_student') : null,
    ([url, token, assignUUID]) =>
      getAssignmentTaskSubmissionsMe(assignmentTaskUUID!, assignUUID, token)
  )

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

  const submissionData =
    view === 'student' ? fetchSubStudentRes?.data : fetchSubGradingRes?.data
  const userSubmissions = submissionData?.task_submission || { fileUUID: '' }
  const userSubmissionObject = submissionData
  const initialUserSubmissions = userSubmissions

  const resetSelectedFile = () => setLocalUploadFile(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!access_token) {
      setError(
        t('dashboard.assignments.editor.task_editor.general.auth_required')
      )
      return
    }
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setUploadSuccess(false)
    setLocalUploadFile(file)
  }

  const handleUploadSelectedFile = async () => {
    if (!access_token) {
      setError(
        t('dashboard.assignments.editor.task_editor.general.auth_required')
      )
      return
    }
    if (!localUploadFile || !assignmentTask) {
      setError('Please select a file first.')
      return
    }
    setIsLoading(true)
    const res = await updateSubFile(
      localUploadFile,
      assignmentTask.assignment_task_uuid,
      assignment.assignment_object.assignment_uuid,
      access_token
    )
    await new Promise((r) => setTimeout(r, 1500))
    if (res.success === false) {
      setError(res.data.detail)
      setUploadSuccess(false)
      setIsLoading(false)
    } else {
      assignmentTaskStateHook({ type: 'reload' })
      await mutateStudentSub()
      mutate(
        `${getAPIUrl()}assignments/${assignment.assignment_object.assignment_uuid}/tasks/submissions/me`
      )
      setIsLoading(false)
      setError('')
      setUploadSuccess(true)
      toast.success(t('dashboard.assignments.editor.toasts.task_saved'))
      resetSelectedFile()
      setTimeout(() => setUploadSuccess(false), 3000)
    }
  }

  const submitFC = async () => {
    if (!access_token) {
      toast.error(
        t(
          'dashboard.assignments.editor.task_editor.general.auth_required_submit'
        )
      )
      return
    }
    if (localUploadFile) {
      toast.error(
        'Please upload or remove the selected file before submitting.'
      )
      return
    }
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

  const showSavingDisclaimer = false

  // Helper: truncate filename keeping extension visible
  const truncateFileName = (name: string) =>
    name.length > 22 ? `${name.slice(0, 10)}...${name.slice(-8)}` : name

  // Helper: human-readable file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

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
      {/* ── Teacher view ── */}
      {view === 'teacher' && (
        <div className="flex flex-col sm:flex-row py-5 sm:py-6 text-xs sm:text-sm justify-center mx-auto space-y-2 sm:space-y-0 sm:space-x-3 text-slate-600 px-4 sm:px-2 text-center sm:text-left bg-slate-50 rounded-lg border border-slate-100">
          <Info size={18} className="mx-auto sm:mx-0 text-slate-500" />
          <p>
            User will be able to submit a file for this task, you'll be able to
            review it in the Submissions Tab
          </p>
        </div>
      )}

      {/* ── Custom-grading view ── */}
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
              className="flex items-center justify-between gap-3 rounded-lg bg-white border border-gray-100 shadow-xs hover:shadow-md active:shadow-xs transition-shadow px-4 py-3 w-full"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-50 shrink-0">
                  <File size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 font-mono uppercase truncate">
                    {`${userSubmissions.fileUUID.slice(0, 8)}…${userSubmissions.fileUUID.slice(-6)}`}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Submitted file
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                <Download size={11} />
                Download
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ── Student view ── */}
      {view === 'student' && (
        <div
          className={`w-full rounded-lg border shadow-xs px-3 py-4 sm:px-6 sm:py-6 ${
            isFocusMode
              ? 'bg-white/5 border-white/10'
              : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex flex-col gap-3">
            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-md text-red-600 p-3 w-full">
                <Info size={14} className="shrink-0 text-red-400 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium leading-snug">
                  {error}
                </p>
              </div>
            )}

            {/* Success banner */}
            {uploadSuccess && (
              <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-md text-emerald-700 p-3 w-full">
                <Cloud size={14} className="shrink-0 text-emerald-500 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium leading-snug">
                  {t(
                    'dashboard.assignments.editor.toasts.file_uploaded_success'
                  ) || 'File uploaded successfully!'}
                </p>
              </div>
            )}

            {/* ── File selected: preview card ──
                Mobile:  icon + name/meta stacked, then action buttons below as a full-width row
                Desktop: icon + name/meta on the left, action buttons pinned to the right inline
            */}
            {localUploadFile && !isLoading && (
              <div
                className={`w-full rounded-lg border ${
                  isFocusMode
                    ? 'bg-white/10 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Always-visible top section: icon + name/meta */}
                <div className="flex items-center gap-3 px-3 py-3">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                      isFocusMode ? 'bg-white/10' : 'bg-emerald-50'
                    }`}
                  >
                    <File
                      size={16}
                      className={
                        isFocusMode ? 'text-zinc-300' : 'text-emerald-600'
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs sm:text-sm font-medium truncate ${
                        isFocusMode ? 'text-zinc-200' : 'text-slate-700'
                      }`}
                    >
                      {truncateFileName(localUploadFile.name)}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 truncate ${
                        isFocusMode ? 'text-zinc-500' : 'text-slate-400'
                      }`}
                    >
                      {localUploadFile.type || 'Unknown type'} ·{' '}
                      {formatFileSize(localUploadFile.size)}
                    </p>
                  </div>

                  {/* Desktop-only: buttons inline to the right of name/meta */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={resetSelectedFile}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border transition-colors ${
                        isFocusMode
                          ? 'border-white/10 text-zinc-400 hover:bg-white/10'
                          : 'border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                      }`}
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={handleUploadSelectedFile}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white transition-colors shadow-xs"
                    >
                      <UploadCloud size={12} />
                      Submit File
                    </button>
                  </div>
                </div>

                {/* Mobile-only: action buttons below, full-width, separated by a border */}
                <div
                  className={`flex sm:hidden items-center gap-2 px-3 pb-3 pt-3 border-t ${
                    isFocusMode ? 'border-white/10' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={resetSelectedFile}
                    className={`flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border transition-colors flex-1 active:scale-95 ${
                      isFocusMode
                        ? 'border-white/10 text-zinc-400 hover:bg-white/10 active:bg-white/20'
                        : 'border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 active:bg-red-100'
                    }`}
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadSelectedFile}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 active:scale-95 text-white transition-colors shadow-xs flex-1"
                  >
                    <UploadCloud size={12} />
                    Submit File
                  </button>
                </div>
              </div>
            )}

            {/* ── Already uploaded file badge ── */}
            {userSubmissions.fileUUID && !isLoading && !localUploadFile && (
              <div
                className={`flex items-center justify-between gap-2 w-full rounded-lg border px-3 py-3 ${
                  isFocusMode
                    ? 'bg-white/10 border-white/10'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                      isFocusMode ? 'bg-white/10' : 'bg-emerald-50'
                    }`}
                  >
                    <Cloud
                      size={16}
                      className={
                        isFocusMode ? 'text-zinc-300' : 'text-emerald-600'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs sm:text-sm font-medium font-mono uppercase truncate ${
                        isFocusMode ? 'text-zinc-200' : 'text-slate-700'
                      }`}
                    >
                      {`${userSubmissions.fileUUID.slice(0, 8)}…${userSubmissions.fileUUID.slice(-6)}`}
                    </p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isFocusMode ? 'text-zinc-500' : 'text-slate-400'
                      }`}
                    >
                      Saved to cloud
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${
                    isFocusMode
                      ? 'bg-white/10 text-zinc-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}
                >
                  Uploaded
                </span>
              </div>
            )}

            {/* Allowed formats info */}
            <div
              className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2.5 border w-full ${
                isFocusMode
                  ? 'bg-white/5 border-white/10 text-zinc-400'
                  : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}
            >
              <Info
                size={13}
                className={`shrink-0 mt-0.5 ${isFocusMode ? 'text-zinc-500' : 'text-slate-400'}`}
              />
              <p className="font-medium leading-snug">
                {t(
                  'dashboard.assignments.editor.task_editor.general.allowed_formats'
                )}
              </p>
            </div>

            {/* Auth / loading / choose-file button */}
            {!access_token ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-md text-amber-600 p-3 w-full">
                <Info size={14} className="shrink-0 text-amber-500 mt-0.5" />
                <p className="text-xs sm:text-sm font-medium leading-snug">
                  {t(
                    'dashboard.assignments.editor.task_editor.general.sign_in_required'
                  )}
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center w-full py-1">
                <div className="font-medium animate-pulse antialiased items-center bg-slate-100 text-slate-600 text-xs sm:text-sm rounded-md px-4 sm:px-5 py-2.5 flex">
                  <Loader size={15} className="mr-2" />
                  <span>Uploading</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center w-full">
                <input
                  type="file"
                  id={'fileInput_' + assignmentTaskUUID}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor={'fileInput_' + assignmentTaskUUID}
                  className="font-medium antialiased items-center text-white text-xs sm:text-sm rounded-md px-4 sm:px-5 py-2.5 flex bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-xs w-full sm:w-auto justify-center cursor-pointer"
                >
                  <UploadCloud size={15} className="mr-2" />
                  <span>
                    {userSubmissions.fileUUID ? 'Replace File' : 'Choose File'}
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </AssignmentBoxUI>
  )
}
