import { useOrg } from '@components/Contexts/OrgContext'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
import { getAPIUrl, getUriWithoutOrg } from '@services/config/config'
import { swrFetcher } from '@services/utils/ts/requests'
import { Globe, Ticket, UserSquare, Users, X, Clock } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import useSWR, { mutate } from 'swr'
import dayjs from 'dayjs'
import {
  changeSignupMechanism,
  deleteInviteCode,
} from '@services/organizations/invites'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import OrgInviteCodeGenerate from '@components/Objects/Modals/Dash/OrgAccess/OrgInviteCodeGenerate'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useTranslation } from 'react-i18next'
import {
  cancelWaitlistConfig,
  updateWaitlistConfig,
} from '@services/waitlist/waitlist'

function OrgAccess() {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const joinMethod =
    org?.config?.config?.features?.members?.signup_mode || 'open'

  const { data: invites } = useSWR(
    org ? `${getAPIUrl()}orgs/${org?.id}/invites` : null,
    (url) => swrFetcher(url, access_token)
  )
  const { data: waitlistCampaigns } = useSWR(
    org && joinMethod === 'waitlist'
      ? `${getAPIUrl()}waitlist/config/org/${org?.id}`
      : null,
    (url) => swrFetcher(url, access_token)
  )
  const waitlistCampaignsKey =
    org && joinMethod === 'waitlist'
      ? `${getAPIUrl()}waitlist/config/org/${org?.id}`
      : null
  const isLoading = !invites
  const [invitesModal, setInvitesModal] = React.useState(false)
  const [campaignFormData, setCampaignFormData] = React.useState({
    name: '',
    description: '',
    interest_category: '',
    launch_datetime: '',
  })
  const [editingWaitlistUuid, setEditingWaitlistUuid] = React.useState<
    string | null
  >(null)
  const [editingCampaignData, setEditingCampaignData] = React.useState({
    name: '',
    description: '',
    launch_datetime: '',
  })
  const router = useRouter()

  async function deleteInvite(invite: any) {
    const toastId = toast.loading(
      t('dashboard.users.signups.invite_codes.toasts.deleting')
    )
    let res = await deleteInviteCode(
      org.id,
      invite.invite_code_uuid,
      access_token
    )
    if (res.status == 200) {
      mutate(`${getAPIUrl()}orgs/${org.id}/invites`)
      toast.success(
        t('dashboard.users.signups.invite_codes.toasts.delete_success'),
        { id: toastId }
      )
    } else {
      toast.error(
        t('dashboard.users.signups.invite_codes.toasts.delete_error'),
        { id: toastId }
      )
    }
  }

  async function changeJoinMethod(method: 'open' | 'inviteOnly' | 'waitlist') {
    const toastId = toast.loading(
      t('dashboard.users.signups.invite_codes.toasts.changing_method')
    )
    let res = await changeSignupMechanism(org.id, method, access_token)
    if (res.status == 200) {
      router.refresh()
      mutate(`${getAPIUrl()}orgs/slug/${org?.slug}`)
      toast.success(
        t('dashboard.users.signups.invite_codes.toasts.change_success', {
          method,
        }),
        { id: toastId }
      )
    } else {
      toast.error(
        t('dashboard.users.signups.invite_codes.toasts.change_error'),
        { id: toastId }
      )
    }
  }

  async function createWaitlistCampaign() {
    if (!campaignFormData.launch_datetime) {
      toast.error('Please provide a launch date and time.')
      return
    }
    const toastId = toast.loading('Creating waitlist campaign...')
    try {
      // Convert datetime-local to ISO 8601 format if provided
      let launchDatetime = null
      if (campaignFormData.launch_datetime) {
        launchDatetime = new Date(
          campaignFormData.launch_datetime
        ).toISOString()
      }

      const payload = {
        org_id: org.id,
        name: campaignFormData.name,
        interest_category: campaignFormData.interest_category,
        description: campaignFormData.description || null,
        launch_datetime: launchDatetime,
      }

      const response = await fetch(`${getAPIUrl()}waitlist/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Waitlist campaign created successfully!', {
          id: toastId,
        })
        setCampaignFormData({
          name: '',
          description: '',
          interest_category: '',
          launch_datetime: '',
        })
        if (waitlistCampaignsKey) {
          mutate(waitlistCampaignsKey)
        }
      } else {
        const errorData = await response.json()
        // FastAPI returns detail as an array of objects: [{loc, msg, type}]
        let errorMessage = 'Failed to create campaign'
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => `${err.loc?.slice(-1)[0]}: ${err.msg}`)
            .join(' | ')
        }
        toast.error(errorMessage, { id: toastId })
      }
    } catch (error: any) {
      toast.error(error.message || 'Error creating campaign', { id: toastId })
    }
  }

  function copyShareableLink(waitlistUuid: string) {
    const link = getUriWithoutOrg(
      `/signup?waitlist_uuid=${waitlistUuid}&orgslug=${org.slug}`
    )
    navigator.clipboard.writeText(link)
    toast.success('Shareable link copied to clipboard!')
  }

  function startEditingWaitlist(campaign: any) {
    setEditingWaitlistUuid(campaign.waitlist_uuid)
    setEditingCampaignData({
      name: campaign.name || '',
      description: campaign.description || '',
      launch_datetime: dayjs(campaign.launch_datetime).format(
        'YYYY-MM-DDTHH:mm'
      ),
    })
  }

  async function saveWaitlistUpdate(waitlistUuid: string) {
    if (!editingCampaignData.launch_datetime) {
      toast.error('Please provide a launch date and time.')
      return
    }

    const toastId = toast.loading('Updating waitlist campaign...')

    const payload = {
      name: editingCampaignData.name,
      description: editingCampaignData.description || null,
      launch_datetime: new Date(
        editingCampaignData.launch_datetime
      ).toISOString(),
    }

    try {
      const response = await updateWaitlistConfig(
        waitlistUuid,
        payload,
        access_token
      )

      if (response.success) {
        toast.success('Waitlist campaign updated successfully!', {
          id: toastId,
        })
        setEditingWaitlistUuid(null)
        setEditingCampaignData({
          name: '',
          description: '',
          launch_datetime: '',
        })
        if (waitlistCampaignsKey) {
          mutate(waitlistCampaignsKey)
        }
      } else {
        let errorMessage = 'Failed to update campaign'
        if (typeof response.data?.detail === 'string') {
          errorMessage = response.data.detail
        } else if (Array.isArray(response.data?.detail)) {
          errorMessage = response.data.detail
            .map((err: any) => `${err.loc?.slice(-1)[0]}: ${err.msg}`)
            .join(' | ')
        }
        toast.error(errorMessage, { id: toastId })
      }
    } catch (error: any) {
      toast.error(error.message || 'Error updating campaign', { id: toastId })
    }
  }

  async function cancelWaitlist(waitlistUuid: string) {
    const toastId = toast.loading('Cancelling waitlist campaign...')
    try {
      const response = await cancelWaitlistConfig(waitlistUuid, access_token)
      if (response.success) {
        toast.success('Waitlist campaign cancelled.', { id: toastId })
        if (editingWaitlistUuid === waitlistUuid) {
          setEditingWaitlistUuid(null)
        }
        if (waitlistCampaignsKey) {
          mutate(waitlistCampaignsKey)
        }
      } else {
        toast.error(response.data?.detail || 'Failed to cancel campaign', {
          id: toastId,
        })
      }
    } catch (error: any) {
      toast.error(error.message || 'Error cancelling campaign', { id: toastId })
    }
  }

  return (
    <>
      {!isLoading ? (
        <>
          <div className="h-6"></div>
          <div className="ml-10 mr-10 mx-auto bg-white rounded-xl shadow-xs px-4 py-4 anit ">
            <div className="flex flex-col bg-gray-50 -space-y-1  px-5 py-3 rounded-md mb-3 ">
              <h1 className="font-bold text-xl text-gray-800">
                {t('dashboard.users.signups.title')}
              </h1>
              <h2 className="text-gray-500  text-md">
                {' '}
                {t('dashboard.users.signups.subtitle')}{' '}
              </h2>
            </div>
            <div className="flex space-x-2 mx-auto">
              <ConfirmationModal
                confirmationButtonText={t(
                  'dashboard.users.signups.open.change_to'
                )}
                confirmationMessage={t(
                  'dashboard.users.signups.open.confirmation_message'
                )}
                dialogTitle={t(
                  'dashboard.users.signups.open.confirmation_title'
                )}
                dialogTrigger={
                  <div className="relative w-full h-[160px] bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 ease-linear transition-all">
                    {joinMethod == 'open' ? (
                      <div className="bg-green-200 text-green-600 font-bold w-fit my-3 mx-3 absolute text-sm px-3 py-1 rounded-lg">
                        {t('dashboard.users.signups.open.active')}
                      </div>
                    ) : null}
                    <div className="flex flex-col space-y-1 justify-center items-center h-full">
                      <Globe className="text-slate-400" size={40}></Globe>
                      <div className="text-2xl text-slate-700 font-bold">
                        {t('dashboard.users.signups.open.title')}
                      </div>
                      <div className="text-gray-400 text-center">
                        {t('dashboard.users.signups.open.description')}
                      </div>
                    </div>
                  </div>
                }
                functionToExecute={() => {
                  changeJoinMethod('open')
                }}
                status="info"
              ></ConfirmationModal>
              <ConfirmationModal
                confirmationButtonText={t(
                  'dashboard.users.signups.closed.change_to'
                )}
                confirmationMessage={t(
                  'dashboard.users.signups.closed.confirmation_message'
                )}
                dialogTitle={t(
                  'dashboard.users.signups.closed.confirmation_title'
                )}
                dialogTrigger={
                  <div className="relative w-full h-[160px] bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 ease-linear transition-all">
                    {joinMethod == 'inviteOnly' ? (
                      <div className="bg-green-200 text-green-600 font-bold w-fit my-3 mx-3 absolute text-sm px-3 py-1 rounded-lg">
                        {t('dashboard.users.signups.closed.active')}
                      </div>
                    ) : null}
                    <div className="flex flex-col space-y-1 justify-center items-center h-full">
                      <Ticket className="text-slate-400" size={40}></Ticket>
                      <div className="text-2xl text-slate-700 font-bold">
                        {t('dashboard.users.signups.closed.title')}
                      </div>
                      <div className="text-gray-400 text-center">
                        {t('dashboard.users.signups.closed.description')}
                      </div>
                    </div>
                  </div>
                }
                functionToExecute={() => {
                  changeJoinMethod('inviteOnly')
                }}
                status="info"
              ></ConfirmationModal>
              <ConfirmationModal
                confirmationButtonText={t(
                  'dashboard.users.signups.waitlist.change_to'
                )}
                confirmationMessage={t(
                  'dashboard.users.signups.waitlist.confirmation_message'
                )}
                dialogTitle={t(
                  'dashboard.users.signups.waitlist.confirmation_title'
                )}
                dialogTrigger={
                  <div className="relative w-full h-[160px] bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 ease-linear transition-all">
                    {joinMethod == 'waitlist' ? (
                      <div className="bg-green-200 text-green-600 font-bold w-fit my-3 mx-3 absolute text-sm px-3 py-1 rounded-lg">
                        {t('dashboard.users.signups.waitlist.active')}
                      </div>
                    ) : null}
                    <div className="flex flex-col space-y-1 justify-center items-center h-full">
                      <Clock className="text-slate-400" size={40}></Clock>
                      <div className="text-2xl text-slate-700 font-bold">
                        {t('dashboard.users.signups.waitlist.title')}
                      </div>
                      <div className="text-gray-400 text-center">
                        {t('dashboard.users.signups.waitlist.description')}
                      </div>
                    </div>
                  </div>
                }
                functionToExecute={() => {
                  changeJoinMethod('waitlist')
                }}
                status="info"
              ></ConfirmationModal>
            </div>

            {/* Create Campaign Form - Inline matching Invite Codes UI */}
            {joinMethod === 'waitlist' && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-indigo-100 mt-4">
                <h3 className="font-bold text-lg text-gray-800 mb-4">
                  Create New Campaign
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      value={campaignFormData.name}
                      onChange={(e) =>
                        setCampaignFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Python Fundamentals"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Interest Category
                    </label>
                    <input
                      type="text"
                      value={campaignFormData.interest_category}
                      onChange={(e) =>
                        setCampaignFormData((prev) => ({
                          ...prev,
                          interest_category: e.target.value,
                        }))
                      }
                      placeholder="e.g., Programming"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={campaignFormData.description}
                      onChange={(e) =>
                        setCampaignFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="What is this waitlist about?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Launch Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={campaignFormData.launch_datetime}
                      onChange={(e) =>
                        setCampaignFormData((prev) => ({
                          ...prev,
                          launch_datetime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() =>
                      setCampaignFormData({
                        name: '',
                        description: '',
                        interest_category: '',
                        launch_datetime: '',
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={createWaitlistCampaign}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors"
                  >
                    <Ticket className="w-4 h-4" />
                    Create Campaign
                  </button>
                </div>
              </div>
            )}

            {/* Waitlist Campaign Management Section */}
            {joinMethod === 'waitlist' && (
              <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200 mt-6">
                <div className="flex flex-col bg-white -space-y-1 px-5 py-3 rounded-md mb-4">
                  <h1 className="font-bold text-xl text-gray-800">
                    {t('dashboard.users.signups.waitlist.campaigns.title')}
                  </h1>
                  <h2 className="text-gray-500 text-md">
                    {t('dashboard.users.signups.waitlist.campaigns.subtitle')}
                  </h2>
                </div>

                {waitlistCampaigns && waitlistCampaigns.length > 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-indigo-100 overflow-hidden mb-4">
                    <table className="w-full">
                      <thead className="bg-indigo-50 border-b border-indigo-100">
                        <tr className="text-sm font-semibold text-gray-700">
                          <th className="px-6 py-3 text-left">Campaign</th>
                          <th className="px-6 py-3 text-left">Launch Date</th>
                          <th className="px-6 py-3 text-left">Registrations</th>
                          <th className="px-6 py-3 text-left">Status</th>
                          <th className="px-6 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {waitlistCampaigns.map((campaign: any) => (
                          <tr
                            key={campaign.waitlist_uuid}
                            className="hover:bg-indigo-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              {editingWaitlistUuid ===
                              campaign.waitlist_uuid ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingCampaignData.name}
                                    onChange={(e) =>
                                      setEditingCampaignData((prev) => ({
                                        ...prev,
                                        name: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                  <input
                                    type="text"
                                    value={editingCampaignData.description}
                                    onChange={(e) =>
                                      setEditingCampaignData((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                      }))
                                    }
                                    placeholder="Description"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="font-semibold text-gray-800">
                                    {campaign.name}
                                  </div>
                                  {campaign.description && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {campaign.description}
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {editingWaitlistUuid ===
                              campaign.waitlist_uuid ? (
                                <input
                                  type="datetime-local"
                                  value={editingCampaignData.launch_datetime}
                                  onChange={(e) =>
                                    setEditingCampaignData((prev) => ({
                                      ...prev,
                                      launch_datetime: e.target.value,
                                    }))
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              ) : (
                                dayjs(campaign.launch_datetime).format(
                                  'MMM DD, YYYY'
                                )
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-indigo-600">
                                {campaign.total_registrations}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  campaign.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-800'
                                    : campaign.status === 'COMPLETED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {campaign.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                {campaign.status === 'CANCELLED' ? (
                                  <span className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded font-semibold">
                                    Cancelled
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() =>
                                        copyShareableLink(
                                          campaign.waitlist_uuid
                                        )
                                      }
                                      className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors font-semibold"
                                    >
                                      📋 Copy Link
                                    </button>

                                    {editingWaitlistUuid ===
                                    campaign.waitlist_uuid ? (
                                      <>
                                        <button
                                          onClick={() =>
                                            saveWaitlistUpdate(
                                              campaign.waitlist_uuid
                                            )
                                          }
                                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-semibold"
                                        >
                                          {campaign.status === 'COMPLETED'
                                            ? 'Reactivate Waitlist'
                                            : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingWaitlistUuid(null)
                                            setEditingCampaignData({
                                              name: '',
                                              description: '',
                                              launch_datetime: '',
                                            })
                                          }}
                                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-semibold"
                                        >
                                          Cancel Edit
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          startEditingWaitlist(campaign)
                                        }
                                        className={`px-3 py-1 text-xs rounded transition-colors font-semibold ${
                                          campaign.status === 'COMPLETED'
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                      >
                                        {campaign.status === 'COMPLETED'
                                          ? '🚀 Reactivate'
                                          : 'Edit'}
                                      </button>
                                    )}

                                    <ConfirmationModal
                                      confirmationButtonText="Cancel Campaign"
                                      confirmationMessage="This will set the campaign status to CANCELLED and stop new waitlist flow for this campaign."
                                      dialogTitle="Cancel Waitlist Campaign"
                                      dialogTrigger={
                                        <button className="px-3 py-1 text-xs bg-rose-100 text-rose-700 rounded hover:bg-rose-200 transition-colors font-semibold">
                                          Cancel Campaign
                                        </button>
                                      }
                                      functionToExecute={() =>
                                        cancelWaitlist(campaign.waitlist_uuid)
                                      }
                                      status="warning"
                                    ></ConfirmationModal>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-6 border border-indigo-100 mb-4">
                    <div className="text-center py-8">
                      <Clock
                        className="text-indigo-400 mx-auto mb-3"
                        size={48}
                      />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        {t(
                          'dashboard.users.signups.waitlist.campaigns.no_campaigns'
                        )}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        {t(
                          'dashboard.users.signups.waitlist.campaigns.create_first'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className={
                joinMethod == 'open' || joinMethod == 'waitlist'
                  ? 'opacity-20 pointer-events-none'
                  : 'pointer-events-auto'
              }
            >
              <div className="flex flex-col bg-gray-50 -space-y-1  px-5 py-3 rounded-md mt-3 mb-3 ">
                <h1 className="font-bold text-xl text-gray-800">
                  {t('dashboard.users.signups.invite_codes.title')}
                </h1>
                <h2 className="text-gray-500  text-md">
                  {t('dashboard.users.signups.invite_codes.subtitle')}{' '}
                </h2>
              </div>
              <table className="table-auto w-full text-left whitespace-nowrap rounded-md overflow-hidden">
                <thead className="bg-gray-100 text-gray-500 rounded-xl uppercase">
                  <tr className="font-bolder text-sm">
                    <th className="py-3 px-4">
                      {t('dashboard.users.signups.invite_codes.table.code')}
                    </th>
                    <th className="py-3 px-4">
                      {t(
                        'dashboard.users.signups.invite_codes.table.signup_link'
                      )}
                    </th>
                    <th className="py-3 px-4">
                      {t('dashboard.users.signups.invite_codes.table.type')}
                    </th>
                    <th className="py-3 px-4">
                      {t(
                        'dashboard.users.signups.invite_codes.table.expiration_date'
                      )}
                    </th>
                    <th className="py-3 px-4">
                      {t('dashboard.users.signups.invite_codes.table.actions')}
                    </th>
                  </tr>
                </thead>
                <>
                  <tbody className="mt-5 bg-white rounded-md">
                    {invites?.map((invite: any) => (
                      <tr
                        key={invite.invite_code_uuid}
                        className="border-b border-gray-100 text-sm"
                      >
                        <td className="py-3 px-4">{invite.invite_code}</td>
                        <td className="py-3 px-4 ">
                          <Link
                            className="bg-gray-50 text-gray-600 px-2 py-1 rounded-md outline-gray-300 outline-dashed outline-1"
                            target="_blank"
                            href={getUriWithoutOrg(
                              `/signup?inviteCode=${invite.invite_code}&orgslug=${org.slug}`
                            )}
                          >
                            {getUriWithoutOrg(
                              `/signup?inviteCode=${invite.invite_code}&orgslug=${org.slug}`
                            )}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          {invite.usergroup_id ? (
                            <div className="flex space-x-2 items-center">
                              <UserSquare className="w-4 h-4" />
                              <span>
                                {t(
                                  'dashboard.users.signups.invite_codes.types.linked_to_usergroup'
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex space-x-2 items-center">
                              <Users className="w-4 h-4" />
                              <span>
                                {t(
                                  'dashboard.users.signups.invite_codes.types.normal'
                                )}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {dayjs(invite.expiration_date)
                            .add(1, 'year')
                            .format('DD/MM/YYYY')}{' '}
                        </td>
                        <td className="py-3 px-4">
                          <ConfirmationModal
                            confirmationButtonText={t(
                              'dashboard.users.signups.invite_codes.actions.delete_code'
                            )}
                            confirmationMessage={t(
                              'dashboard.users.signups.invite_codes.actions.delete_confirmation_message'
                            )}
                            dialogTitle={t(
                              'dashboard.users.signups.invite_codes.actions.delete_confirmation_title'
                            )}
                            dialogTrigger={
                              <button className="mr-2 flex space-x-2 hover:cursor-pointer p-1 px-3 bg-rose-700 rounded-md font-bold items-center text-sm text-rose-100">
                                <X className="w-4 h-4" />
                                <span>
                                  {' '}
                                  {t(
                                    'dashboard.users.signups.invite_codes.actions.delete_code'
                                  )}
                                </span>
                              </button>
                            }
                            functionToExecute={() => {
                              deleteInvite(invite)
                            }}
                            status="warning"
                          ></ConfirmationModal>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              </table>
              <div className="flex flex-row-reverse mt-3 mr-2">
                <Modal
                  isDialogOpen={invitesModal}
                  onOpenChange={() => setInvitesModal(!invitesModal)}
                  minHeight="no-min"
                  minWidth="lg"
                  dialogContent={
                    <OrgInviteCodeGenerate setInvitesModal={setInvitesModal} />
                  }
                  dialogTitle={t(
                    'dashboard.users.signups.invite_codes.actions.generate_title'
                  )}
                  dialogDescription={t(
                    'dashboard.users.signups.invite_codes.actions.generate_description'
                  )}
                  dialogTrigger={
                    <button className=" flex space-x-2 hover:cursor-pointer p-1 px-3 bg-green-700 rounded-md font-bold items-center text-sm text-green-100">
                      <Ticket className="w-4 h-4" />
                      <span>
                        {' '}
                        {t(
                          'dashboard.users.signups.invite_codes.actions.generate'
                        )}
                      </span>
                    </button>
                  }
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <PageLoading />
      )}
    </>
  )
}

export default OrgAccess
