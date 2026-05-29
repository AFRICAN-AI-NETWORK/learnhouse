'use client'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import RolesUpdate from '@components/Objects/Modals/Dash/OrgUsers/RolesUpdate'
import ConfirmationModal from '@components/Objects/StyledElements/ConfirmationModal/ConfirmationModal'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import Toast from '@components/Objects/StyledElements/Toast/Toast'
import { getAPIUrl } from '@services/config/config'
import { deleteUser } from '@services/users/users'
import { swrFetcher } from '@services/utils/ts/requests'
import { KeyRound, LogOut, Search } from 'lucide-react'
import React from 'react'
import toast from 'react-hot-toast'
import useSWR, { mutate } from 'swr'
import { useTranslation } from 'react-i18next'

function OrgUsers() {
  const { t } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const { data: orgUsers } = useSWR(
    org ? `${getAPIUrl()}orgs/${org?.id}/users` : null,
    (url) => swrFetcher(url, access_token)
  )
  const [rolesModal, setRolesModal] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState(null) as any
  const [searchQuery, setSearchQuery] = React.useState('')
  const isLoading = !orgUsers

  const filteredOrgUsers = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) return orgUsers

    return orgUsers?.filter((user: any) => {
      const fullName = [user.user.first_name, user.user.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const username = user.user.username?.toLowerCase() || ''

      return (
        fullName.includes(normalizedQuery) ||
        username.includes(normalizedQuery)
      )
    })
  }, [orgUsers, searchQuery])

  const handleRolesModal = (user_uuid: any) => {
    setSelectedUser(user_uuid)
    setRolesModal(!rolesModal)
  }

  const handleRemoveUser = async (user_id: any) => {
    const toastId = toast.loading(
      t('dashboard.users.active_users.actions.removing')
    )
    const res = await deleteUser(user_id, access_token)
    if (res.status === 200) {
      await mutate(`${getAPIUrl()}orgs/${org.id}/users`)
      toast.success(t('dashboard.users.active_users.actions.remove_success'), {
        id: toastId,
      })
    } else {
      toast.error(t('dashboard.users.active_users.actions.remove_error'), {
        id: toastId,
      })
    }
  }

  return (
    <div>
      {isLoading ? (
        <div>
          <PageLoading />
        </div>
      ) : (
        <>
          <Toast></Toast>
          <div className="h-6"></div>
          <div className="ml-10 mr-10 mx-auto bg-white rounded-xl shadow-xs px-4 py-4 dark:border dark:border-white/8 dark:bg-[#13131a] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-3 bg-gray-50 px-5 py-3 rounded-md mb-3 dark:bg-white/5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col -space-y-1">
                <h1 className="font-bold text-xl text-gray-800 dark:text-white/90">
                  {t('dashboard.users.active_users.title')}
                </h1>
                <h2 className="text-gray-500 text-md dark:text-white/50">
                  {' '}
                  {t('dashboard.users.active_users.subtitle')}{' '}
                </h2>
              </div>
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/35" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search names..."
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:placeholder:text-white/35 dark:focus:border-white/20 dark:focus:ring-white/10"
                />
              </div>
            </div>
            <table className="table-auto w-full text-left whitespace-nowrap rounded-md overflow-hidden">
              <thead className="bg-gray-100 text-gray-500 rounded-xl uppercase dark:bg-white/5 dark:text-white/45">
                <tr className="font-bolder text-sm">
                  <th className="py-3 px-4">
                    {t('dashboard.users.active_users.table.user')}
                  </th>
                  <th className="py-3 px-4">
                    {t('dashboard.users.active_users.table.role')}
                  </th>
                  <th className="py-3 px-4">
                    {t('dashboard.users.active_users.table.actions')}
                  </th>
                </tr>
              </thead>
              <>
                <tbody className="mt-5 bg-white rounded-md dark:bg-[#13131a] dark:text-white/75">
                  {filteredOrgUsers?.map((user: any) => (
                    <tr
                      key={user.user.id}
                      className="border-b border-gray-200 border-dashed dark:border-white/8"
                    >
                      <td className="py-3 px-4 flex space-x-2 items-center">
                        <span>
                          {user.user.first_name + ' ' + user.user.last_name}
                        </span>
                        <span className="text-xs bg-neutral-100 p-1 px-2 rounded-full text-neutral-400 font-semibold dark:bg-white/7 dark:text-white/35">
                          @{user.user.username}
                        </span>
                      </td>
                      <td className="py-3 px-4">{user.role.name}</td>
                      <td className="py-3 px-4 flex-col space-y-2 items-end">
                        <Modal
                          isDialogOpen={
                            rolesModal && selectedUser === user.user.user_uuid
                          }
                          onOpenChange={() =>
                            handleRolesModal(user.user.user_uuid)
                          }
                          minHeight="no-min"
                          dialogContent={
                            <RolesUpdate
                              alreadyAssignedRole={user.role.role_uuid}
                              setRolesModal={setRolesModal}
                              user={user}
                            />
                          }
                          dialogTitle={t(
                            'dashboard.users.active_users.modals.update_role.title'
                          )}
                          dialogDescription={t(
                            'dashboard.users.active_users.modals.update_role.description',
                            { username: user.user.username }
                          )}
                          dialogTrigger={
                            <button className="flex space-x-2 hover:cursor-pointer p-1 px-3 bg-yellow-700 rounded-md font-bold items-center text-sm text-yellow-100">
                              <KeyRound className="w-4 h-4" />
                              <span>
                                {' '}
                                {t(
                                  'dashboard.users.active_users.actions.edit_role'
                                )}
                              </span>
                            </button>
                          }
                        />

                        <ConfirmationModal
                          confirmationButtonText={t(
                            'dashboard.users.active_users.modals.remove_user.button'
                          )}
                          confirmationMessage={t(
                            'dashboard.users.active_users.modals.remove_user.message'
                          )}
                          dialogTitle={t(
                            'dashboard.users.active_users.modals.remove_user.title',
                            { username: user.user.username }
                          )}
                          dialogTrigger={
                            <button className="mr-2 flex space-x-2 hover:cursor-pointer p-1 px-3 bg-rose-700 rounded-md font-bold items-center text-sm text-rose-100">
                              <LogOut className="w-4 h-4" />
                              <span>
                                {' '}
                                {t(
                                  'dashboard.users.active_users.actions.remove_from_org'
                                )}
                              </span>
                            </button>
                          }
                          functionToExecute={() => {
                            handleRemoveUser(user.user.id)
                          }}
                          status="warning"
                        ></ConfirmationModal>
                      </td>
                    </tr>
                  ))}
                  {filteredOrgUsers?.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-8 px-4 text-center text-sm font-medium text-gray-500 dark:text-white/45"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default OrgUsers
