import { useLHSession } from '@components/Contexts/LHSessionContext'
import UserAvatar from '@components/Objects/UserAvatar'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import { getAPIUrl } from '@services/config/config'
import { getUserAvatarMediaDirectory } from '@services/media/media'
import { swrFetcher } from '@services/utils/ts/requests'
import { RotateCcw, SendHorizonal, UserCheck, X } from 'lucide-react'
import React from 'react'
import useSWR from 'swr'
import EvaluateAssignment from './Modals/EvaluateAssignment'
import { AssignmentProvider } from '@components/Contexts/Assignments/AssignmentContext'
import { AssignmentsTaskProvider } from '@components/Contexts/Assignments/AssignmentsTaskContext'
import AssignmentSubmissionProvider from '@components/Contexts/Assignments/AssignmentSubmissionContext'
import { useTranslation } from 'react-i18next'

function AssignmentSubmissionsSubPage({
  assignment_uuid,
}: {
  assignment_uuid: string
}) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const normalizedAssignmentUUID = assignment_uuid.startsWith('assignment_')
    ? assignment_uuid
    : `assignment_${assignment_uuid}`

  const { data: assignmentSubmission, error: assignmentError } = useSWR(
    `${getAPIUrl()}assignments/${normalizedAssignmentUUID}/submissions`,
    (url) => swrFetcher(url, access_token)
  )

  const submissions = Array.isArray(assignmentSubmission)
    ? assignmentSubmission
    : []

  const renderSubmissions = (status: string) => {
    return submissions
      ?.filter((submission: any) => submission.submission_status === status)
      .map((submission: any) => (
        <SubmissionBox
          key={submission.assignmentusersubmission_uuid}
          submission={submission}
          assignment_uuid={normalizedAssignmentUUID}
          user_id={submission.user_id}
        />
      ))
  }

  if (assignmentError) {
    return (
      <div className="flex w-full flex-col px-4 pt-3 sm:px-6 lg:px-10">
        <div className="text-sm font-medium text-red-600">
          {t('common.something_went_wrong')}
        </div>
      </div>
    )
  }

  if (!assignmentSubmission) {
    return (
      <div className="flex w-full flex-col px-4 pt-3 sm:px-6 lg:px-10">
        <div className="text-sm font-medium text-slate-500">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full min-w-0 flex-col px-4 pt-3 sm:px-6 lg:px-10">
      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="flex-1">
          <div className="flex w-fit mx-auto px-3.5 py-1 bg-rose-600/80 space-x-2 my-5 items-center text-sm font-bold text-white rounded-full">
            <X size={18} />
            <h3>{t('dashboard.assignments.submissions.status.late')}</h3>
          </div>
          <div className="flex flex-col gap-4">{renderSubmissions('LATE')}</div>
        </div>
        <div className="flex-1">
          <div className="flex w-fit mx-auto px-3.5 py-1 bg-amber-600/80 space-x-2 my-5 items-center text-sm font-bold text-white rounded-full">
            <SendHorizonal size={18} />
            <h3>{t('dashboard.assignments.submissions.status.submitted')}</h3>
          </div>
          <div className="flex flex-col gap-4">
            {renderSubmissions('SUBMITTED')}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex w-fit mx-auto px-3.5 py-1 bg-sky-600/80 space-x-2 my-5 items-center text-sm font-bold text-white rounded-full">
            <RotateCcw size={18} />
            <h3>
              {t('dashboard.assignments.submissions.status.needs_revision')}
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            {renderSubmissions('NEEDS_REVISION')}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex w-fit mx-auto px-3.5 py-1 bg-emerald-600/80 space-x-2 my-5 items-center text-sm font-bold text-white rounded-full">
            <UserCheck size={18} />
            <h3>{t('dashboard.assignments.submissions.status.graded')}</h3>
          </div>
          <div className="flex flex-col gap-4">
            {renderSubmissions('GRADED')}
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmissionBox({ assignment_uuid, user_id, submission }: any) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [gradeSudmissionModal, setGradeSubmissionModal] = React.useState({
    open: false,
    submission_id: '',
  })

  const { data: user, error: userError } = useSWR(
    `${getAPIUrl()}users/id/${user_id}`,
    (url) => swrFetcher(url, access_token)
  )

  return (
    <div className="mx-auto flex w-full max-w-[350px] flex-row rounded-lg bg-white p-4 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] nice-shadow">
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex w-full flex-col gap-1 sm:flex-row sm:justify-between">
          <h2 className="uppercase text-slate-400 text-xs tracking-tight font-semibold">
            {t('dashboard.assignments.submissions.submission_label')}
          </h2>
          <p className="uppercase text-xs tracking-tight font-semibold">
            {new Date(submission.creation_date).toLocaleDateString('en-UK', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:space-x-2">
          <div className="flex min-w-0 space-x-2">
            <UserAvatar
              border="border-4"
              avatar_url={getUserAvatarMediaDirectory(
                user?.user_uuid,
                user?.avatar_image
              )}
              predefined_avatar={user?.avatar_image ? undefined : 'empty'}
              width={40}
            />
            <div className="flex min-w-0 flex-col">
              {user?.first_name && user?.last_name ? (
                <p className="truncate text-sm font-semibold">
                  {user?.first_name} {user?.last_name}
                </p>
              ) : (
                <p className="truncate text-sm font-semibold">
                  @{user?.username}
                </p>
              )}
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-col sm:items-end">
            <Modal
              isDialogOpen={
                gradeSudmissionModal.open &&
                gradeSudmissionModal.submission_id ===
                  submission.assignmentusersubmission_uuid
              }
              onOpenChange={(open: boolean) =>
                setGradeSubmissionModal({
                  open,
                  submission_id: submission.assignmentusersubmission_uuid,
                })
              }
              minHeight="no-min"
              minWidth="lg"
              dialogContent={
                <AssignmentProvider assignment_uuid={assignment_uuid}>
                  <AssignmentsTaskProvider>
                    <AssignmentSubmissionProvider
                      assignment_uuid={assignment_uuid}
                    >
                      <EvaluateAssignment user_id={user_id} />
                    </AssignmentSubmissionProvider>
                  </AssignmentsTaskProvider>
                </AssignmentProvider>
              }
              dialogTitle={t(
                'dashboard.assignments.submissions.evaluate_modal.title',
                { username: user?.username }
              )}
              dialogDescription={t(
                'dashboard.assignments.submissions.evaluate_modal.description'
              )}
              dialogTrigger={
                <div className="min-h-10 rounded bg-slate-800 px-4 py-2 text-center text-xs font-bold text-white cursor-pointer hover:bg-slate-700">
                  {submission.submission_status === 'GRADED'
                    ? t('dashboard.assignments.submissions.review')
                    : t('dashboard.assignments.submissions.evaluate')}
                </div>
              }
            />
          </div>
        </div>
        {submission.submission_feedback && (
          <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
            {submission.submission_feedback}
          </div>
        )}
      </div>
    </div>
  )
}

export default AssignmentSubmissionsSubPage
