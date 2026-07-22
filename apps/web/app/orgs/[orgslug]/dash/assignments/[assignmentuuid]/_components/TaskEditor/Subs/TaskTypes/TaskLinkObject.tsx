import { useAssignments } from '@components/Contexts/Assignments/AssignmentContext'
import { useAssignmentsTaskDispatch } from '@components/Contexts/Assignments/AssignmentsTaskContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import AssignmentBoxUI from '@components/Objects/Activities/Assignment/AssignmentBoxUI'
import {
  getAssignmentTask,
  getAssignmentTaskSubmissionsMe,
  getAssignmentTaskSubmissionsUser,
  handleAssignmentTaskSubmission,
} from '@services/courses/assignments'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import { Cloud, ExternalLink, Info, Link as LinkIcon, Send } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

type LinkSchema = {
  linkUrl: string
  assignment_task_submission_uuid?: string
}

type TaskLinkObjectProps = {
  view: 'teacher' | 'student' | 'custom-grading'
  assignmentTaskUUID?: string
  user_id?: string
  isFocusMode?: boolean
}

/** A well-formed http(s) URL — anything else isn't safe to open in a new tab as a submission link. */
const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const truncateUrl = (url: string) =>
  url.length > 42 ? `${url.slice(0, 30)}…${url.slice(-8)}` : url

export default function TaskLinkObject({
  view,
  user_id,
  assignmentTaskUUID,
  isFocusMode = false,
}: TaskLinkObjectProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const assignmentTaskStateHook = useAssignmentsTaskDispatch() as any
  const assignment = useAssignments() as any

  const [linkInput, setLinkInput] = React.useState('')
  const [hasEditedInput, setHasEditedInput] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
  const userSubmissions: LinkSchema = submissionData?.task_submission || {
    linkUrl: '',
  }
  const userSubmissionObject = submissionData

  // Seed the input from the fetched submission once, without clobbering
  // what the student is actively typing.
  React.useEffect(() => {
    if (view === 'student' && !hasEditedInput && userSubmissions.linkUrl) {
      setLinkInput(userSubmissions.linkUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSubmissions.linkUrl])

  const submitFC = async () => {
    if (!access_token) {
      toast.error(
        t(
          'dashboard.assignments.editor.task_editor.general.auth_required_submit'
        )
      )
      return
    }
    const trimmed = linkInput.trim()
    if (!trimmed) {
      setError('Please paste a link before submitting.')
      return
    }
    if (!isValidHttpUrl(trimmed)) {
      setError('Please enter a valid link starting with http:// or https://')
      return
    }
    setError(null)

    const values = {
      assignment_task_submission_uuid:
        userSubmissions.assignment_task_submission_uuid || null,
      task_submission: { linkUrl: trimmed },
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
      if (grade > (assignmentTask?.max_grade_value || 100)) {
        toast.error(
          `Grade cannot be more than ${assignmentTask?.max_grade_value} points`
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

  return (
    <AssignmentBoxUI
      submitFC={submitFC}
      view={view}
      gradeCustomFC={gradeCustomFC}
      currentPoints={userSubmissionObject?.grade}
      maxPoints={assignmentTask?.max_grade_value}
      type="link"
      isFocusMode={isFocusMode}
    >
      {/* ── Teacher view ── */}
      {view === 'teacher' && (
        <div className="flex flex-col sm:flex-row py-5 sm:py-6 text-xs sm:text-sm justify-center mx-auto space-y-2 sm:space-y-0 sm:space-x-3 text-slate-600 px-4 sm:px-2 text-center sm:text-left bg-slate-50 rounded-lg border border-slate-100">
          <Info size={18} className="mx-auto sm:mx-0 text-slate-500" />
          <p>
            Students will be able to submit a link for this task, you'll be able
            to review it in the Submissions Tab
          </p>
        </div>
      )}

      {/* ── Custom-grading view ── */}
      {view === 'custom-grading' && (
        <div className="flex flex-col space-y-4 w-full px-2 sm:px-0">
          <div className="flex flex-col sm:flex-row py-5 sm:py-6 text-xs sm:text-sm justify-center mx-auto space-y-2 sm:space-y-0 sm:space-x-3 text-slate-600 px-4 sm:px-2 text-center sm:text-left bg-slate-50 rounded-lg border border-slate-100">
            <ExternalLink
              size={18}
              className="mx-auto sm:mx-0 text-slate-500"
            />
            <p>
              Please open the link and grade it manually, then input the grade
              above
            </p>
          </div>
          {userSubmissions.linkUrl && (
            <Link
              href={userSubmissions.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg bg-white border border-gray-100 shadow-xs hover:shadow-md active:shadow-xs transition-shadow px-4 py-3 w-full"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 shrink-0">
                  <LinkIcon size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">
                    {truncateUrl(userSubmissions.linkUrl)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Submitted link
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full shrink-0">
                <ExternalLink size={11} />
                Open Link
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

            {userSubmissions.linkUrl && (
              <div
                className={`flex items-center gap-2 text-[11px] font-medium px-2.5 py-1 rounded-full w-fit ${
                  isFocusMode
                    ? 'bg-white/10 text-zinc-300'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}
              >
                <Cloud size={12} />
                Link submitted
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div
                className={`flex items-center flex-1 min-w-0 rounded-lg border px-3 ${
                  isFocusMode
                    ? 'bg-white/10 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <LinkIcon
                  size={14}
                  className={`shrink-0 mr-2 ${isFocusMode ? 'text-zinc-500' : 'text-slate-400'}`}
                />
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => {
                    setHasEditedInput(true)
                    setError(null)
                    setLinkInput(e.target.value)
                  }}
                  placeholder="https://..."
                  className={`w-full bg-transparent py-2.5 text-xs sm:text-sm outline-none ${
                    isFocusMode
                      ? 'text-zinc-100 placeholder:text-zinc-600'
                      : 'text-slate-700 placeholder:text-slate-400'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={submitFC}
                className="flex items-center justify-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white transition-colors shadow-xs shrink-0"
              >
                <Send size={12} />
                Submit Link
              </button>
            </div>
          </div>
        </div>
      )}
    </AssignmentBoxUI>
  )
}
