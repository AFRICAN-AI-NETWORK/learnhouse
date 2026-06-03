'use client'
import { useCourse } from '@components/Contexts/CourseContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getAPIUrl, getUriWithOrg } from '@services/config/config'
import { linkResourcesToUserGroup } from '@services/usergroups/usergroups'
import { swrFetcher } from '@services/utils/ts/requests'
import { Info } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import useSWR, { mutate } from 'swr'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

type LinkToUserGroupProps = {
  // React function, todo: fix types
  setUserGroupModal: any
}

function LinkToUserGroup(props: LinkToUserGroupProps) {
  const { t } = useTranslation()
  const course = useCourse() as any
  const org = useOrg() as any
  const session = useLHSession() as any
  const access_token = session?.data?.tokens?.access_token
  const courseStructure = course.courseStructure

  const { data: usergroups } = useSWR(
    courseStructure && org ? `${getAPIUrl()}usergroups/org/${org.id}` : null,
    (url) => swrFetcher(url, access_token)
  )
  const [selectedUserGroup, setSelectedUserGroup] = React.useState(null) as any
  const activeUserGroup =
    selectedUserGroup ||
    (usergroups && usergroups.length > 0 ? usergroups[0].id : null)

  const handleLink = async () => {
    try {
      const res = (await linkResourcesToUserGroup(
        activeUserGroup,
        courseStructure.course_uuid,
        access_token
      )) as any
      if (res.status === 200 || res.status === 201) {
        toast.success(
          t('dashboard.courses.access.usergroups.toasts.link_success') ||
            'Linked successfully'
        )
        // Trigger SWR mutation to update the list on the parent UI
        mutate(
          `${getAPIUrl()}usergroups/resource/${courseStructure.course_uuid}`
        )
        // Close modal
        props.setUserGroupModal(false)
      } else {
        toast.error(
          t('dashboard.courses.access.usergroups.toasts.link_error') ||
            'Error linking usergroup'
        )
      }
    } catch (e) {
      toast.error(
        t('dashboard.courses.access.usergroups.toasts.link_error') ||
          'Error linking usergroup'
      )
    }
  }

  return (
    <div className="flex flex-col space-y-1 ">
      <div className="flex bg-yellow-100 text-yellow-900 mx-auto w-fit mt-3 px-4 py-2 space-x-2 text-sm rounded-full items-center">
        <Info size={19} />
        <h1 className=" font-medium">
          {t('dashboard.courses.access.usergroups.modals.warning')}
        </h1>
      </div>
      <div className="p-4 flex-row flex justify-between items-center">
        {usergroups?.length >= 1 && (
          <div className="py-1">
            <span className="px-3 text-gray-400 font-bold rounded-full py-1 bg-gray-100 mx-3">
              {t('dashboard.courses.access.usergroups.modals.usergroup_name')}{' '}
            </span>

            <select
              onChange={(e) => setSelectedUserGroup(e.target.value)}
              defaultValue={selectedUserGroup}
            >
              {usergroups &&
                usergroups.map((group: any) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        {usergroups?.length == 0 && (
          <div className="flex space-x-3 items-center">
            <span className="px-3 text-yellow-700 font-bold rounded-full py-1 mx-3">
              {t('dashboard.courses.access.usergroups.modals.no_usergroups')}{' '}
            </span>
            <Link
              className="px-3 text-blue-700 font-bold rounded-full py-1 bg-blue-100 mx-1"
              target="_blank"
              href={getUriWithOrg(org.slug, '/dash/users/settings/usergroups')}
            >
              {t('dashboard.courses.access.usergroups.modals.create_usergroup')}
            </Link>
          </div>
        )}
        <div className="py-3">
          <button
            onClick={() => {
              handleLink()
            }}
            className="bg-green-700 text-white font-bold px-4 py-2 rounded-md shadow-sm"
          >
            {t('dashboard.courses.access.usergroups.modals.link_button')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LinkToUserGroup
