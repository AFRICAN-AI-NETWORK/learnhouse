'use client'
import BreadCrumbs from '@components/Dashboard/Misc/BreadCrumbs'
import {
  BookOpen,
  BookX,
  EllipsisVertical,
  Eye,
  Layers2,
  Pencil,
  UserRoundPen,
} from 'lucide-react'
import React, { useEffect } from 'react'
import {
  AssignmentProvider,
  useAssignments,
} from '@components/Contexts/Assignments/AssignmentContext'
import ToolTip from '@components/Objects/StyledElements/Tooltip/Tooltip'
import { updateAssignment } from '@services/courses/assignments'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { mutate } from 'swr'
import { getAPIUrl } from '@services/config/config'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { updateActivity } from '@services/courses/activities'
// Lazy Loading
import dynamic from 'next/dynamic'
import AssignmentEditorSubPage from './subpages/AssignmentEditorSubPage'
import EditAssignmentModal from '@components/Objects/Modals/Activities/Assignments/EditAssignmentModal'
import { useTranslation } from 'react-i18next'
const AssignmentSubmissionsSubPage = dynamic(
  () => import('./subpages/AssignmentSubmissionsSubPage')
)

function AssignmentEdit() {
  const { t } = useTranslation()
  const params = useParams<{ assignmentuuid: string }>()
  const searchParams = useSearchParams()
  const [selectedSubPage, setSelectedSubPage] = React.useState(
    searchParams.get('subpage') || 'editor'
  )

  return (
    <div className="flex w-full min-w-0 flex-col">
      <AssignmentProvider
        assignment_uuid={'assignment_' + params.assignmentuuid}
      >
        <div className="flex flex-col bg-white z-50 shadow-[0px_4px_16px_rgba(0,0,0,0.06)] nice-shadow">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 tracking-tighter">
              <BrdCmpx />
              <div className="flex min-w-0 justify-between">
                <div className="flex min-w-0 font-bold text-xl sm:text-2xl">
                  <AssignmentTitle />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col justify-center antialiased">
              <PublishingState />
            </div>
          </div>
          <div className="flex min-w-0 gap-2 overflow-x-auto px-4 pt-1 text-sm tracking-tight font-semibold sm:px-6 lg:px-10">
            <div
              onClick={() => setSelectedSubPage('editor')}
              className={`flex shrink-0 py-2 text-center border-black transition-all ease-linear ${
                selectedSubPage === 'editor' ? 'border-b-4' : 'opacity-50'
              } cursor-pointer`}
            >
              <div className="flex items-center space-x-2.5 mx-2">
                <Layers2 size={16} />
                <div>{t('dashboard.assignments.detail.tabs.editor')}</div>
              </div>
            </div>
            <div
              onClick={() => setSelectedSubPage('submissions')}
              className={`flex shrink-0 py-2 text-center border-black transition-all ease-linear ${
                selectedSubPage === 'submissions' ? 'border-b-4' : 'opacity-50'
              } cursor-pointer`}
            >
              <div className="flex items-center space-x-2.5 mx-2">
                <UserRoundPen size={16} />
                <div>{t('dashboard.assignments.detail.tabs.submissions')}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-full w-full min-w-0 flex-col lg:flex-row">
          {selectedSubPage === 'editor' && (
            <AssignmentEditorSubPage assignmentuuid={params.assignmentuuid} />
          )}
          {selectedSubPage === 'submissions' && (
            <AssignmentSubmissionsSubPage
              assignment_uuid={params.assignmentuuid}
            />
          )}
        </div>
      </AssignmentProvider>
    </div>
  )
}

export default AssignmentEdit

function BrdCmpx() {
  const assignment = useAssignments() as any

  useEffect(() => {}, [assignment])

  return (
    <BreadCrumbs
      type="assignments"
      last_breadcrumb={assignment?.assignment_object?.title}
    />
  )
}

function PublishingState() {
  const { t } = useTranslation()
  const assignment = useAssignments() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)

  async function updateAssignmentPublishState(assignmentUUID: string) {
    const res = await updateAssignment(
      { published: !assignment?.assignment_object?.published },
      assignmentUUID,
      access_token
    )
    const res2 = await updateActivity(
      { published: !assignment?.assignment_object?.published },
      assignment?.activity_object?.activity_uuid,
      access_token
    )
    const toast_loading = toast.loading(
      t('dashboard.assignments.detail.publishing.toasts.updating')
    )
    if (res.success && res2) {
      mutate(`${getAPIUrl()}assignments/${assignmentUUID}`)
      toast.success(
        t('dashboard.assignments.detail.publishing.toasts.update_success')
      )
      toast.dismiss(toast_loading)
    } else {
      toast.error(
        t('dashboard.assignments.detail.publishing.toasts.update_error')
      )
    }
  }

  useEffect(() => {}, [assignment])

  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-2 lg:mt-5 lg:justify-end">
        <div
          className={`flex text-xs rounded-full px-3.5 py-2 font-bold outline outline-1 ${!assignment?.assignment_object?.published ? 'outline-gray-300 bg-gray-200/60' : 'outline-green-300 bg-green-200/60'}`}
        >
          {assignment?.assignment_object?.published
            ? t('dashboard.assignments.detail.publishing.published')
            : t('dashboard.assignments.detail.publishing.unpublished')}
        </div>
        <div className="hidden sm:block">
          <EllipsisVertical className="text-gray-500" size={13} />
        </div>

        <ToolTip
          side="left"
          slateBlack
          sideOffset={10}
          content={t('dashboard.assignments.detail.publishing.edit_tooltip')}
        >
          <div
            onClick={() => setIsEditModalOpen(true)}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-blue-600/10 bg-linear-to-bl from-blue-400/50 to-blue-200/80 px-3 py-2 font-medium text-blue-800 shadow-lg shadow-blue-900/10 sm:flex-none"
          >
            <Pencil size={18} className="shrink-0" />
            <p className="text-sm font-bold whitespace-nowrap">
              {t('dashboard.assignments.detail.publishing.edit')}
            </p>
          </div>
        </ToolTip>

        <ToolTip
          side="left"
          slateBlack
          sideOffset={10}
          content={t('dashboard.assignments.detail.publishing.preview_tooltip')}
        >
          <Link
            target="_blank"
            href={`/course/${assignment?.course_object?.course_uuid.replace('course_', '')}/activity/${assignment?.activity_object?.activity_uuid.replace('activity_', '')}`}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-cyan-600/10 bg-linear-to-bl from-sky-400/50 to-cyan-200/80 px-3 py-2 font-medium text-cyan-800 shadow-lg shadow-cyan-900/10 sm:flex-none"
          >
            <Eye size={18} className="shrink-0" />
            <p className="text-sm font-bold whitespace-nowrap">
              {t('dashboard.assignments.detail.publishing.preview')}
            </p>
          </Link>
        </ToolTip>
        {assignment?.assignment_object?.published && (
          <ToolTip
            side="left"
            slateBlack
            sideOffset={10}
            content={t(
              'dashboard.assignments.detail.publishing.unpublish_tooltip'
            )}
          >
            <div
              onClick={() =>
                updateAssignmentPublishState(
                  assignment?.assignment_object?.assignment_uuid
                )
              }
              className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-600/10 bg-linear-to-bl from-gray-400/50 to-gray-200/80 px-3 py-2 font-medium text-gray-800 shadow-lg shadow-gray-900/10 sm:flex-none"
            >
              <BookX size={18} className="shrink-0" />
              <p className="text-sm font-bold whitespace-nowrap">
                {t('dashboard.assignments.detail.publishing.unpublish')}
              </p>
            </div>
          </ToolTip>
        )}
        {!assignment?.assignment_object?.published && (
          <ToolTip
            side="left"
            slateBlack
            sideOffset={10}
            content={t(
              'dashboard.assignments.detail.publishing.publish_tooltip'
            )}
          >
            <div
              onClick={() =>
                updateAssignmentPublishState(
                  assignment?.assignment_object?.assignment_uuid
                )
              }
              className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-green-600/10 bg-linear-to-bl from-green-400/50 to-lime-200/80 px-3 py-2 font-medium text-green-800 shadow-lg shadow-green-900/10 sm:flex-none"
            >
              <BookOpen size={18} className="shrink-0" />
              <p className="text-sm font-bold whitespace-nowrap">
                {t('dashboard.assignments.detail.publishing.publish')}
              </p>
            </div>
          </ToolTip>
        )}
      </div>
      {isEditModalOpen && (
        <EditAssignmentModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          assignment={assignment?.assignment_object}
          accessToken={access_token}
        />
      )}
    </>
  )
}

function AssignmentTitle() {
  const { t } = useTranslation()
  const assignment = useAssignments() as any

  return (
    <div className="flex items-center gap-2">
      {t('dashboard.assignments.detail.title')}
    </div>
  )
}
