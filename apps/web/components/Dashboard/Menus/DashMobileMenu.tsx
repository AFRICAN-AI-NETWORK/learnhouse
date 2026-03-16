'use client'

import {
  Backpack,
  BadgeDollarSign,
  BookCopy,
  Home,
  School,
  Settings,
  Users,
  Megaphone,
} from 'lucide-react'
import Link from 'next/link'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import ToolTip from '@components/Objects/StyledElements/Tooltip/Tooltip'
import useAdminStatus from '@components/Hooks/useAdminStatus'

function DashMobileMenu() {
  const session = useLHSession() as any
  const { isAdmin, loading, rights } = useAdminStatus() as any

  const canSeeCourses = isAdmin || rights?.courses?.action_read
  const canSeeAssignments = isAdmin || rights?.coursechapters?.action_read
  const canSeeUsers = isAdmin || rights?.users?.action_read
  const canSeeOrg = isAdmin || rights?.organizations?.action_read
  const canSeeCommunications = isAdmin || rights?.communications?.action_read

  if (loading) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg text-white shadow-xl z-50">
      <div className="flex justify-around items-center h-16 px-2 overflow-x-auto">
        <ToolTip content={'Home'} slateBlack sideOffset={8} side="top">
          <Link
            href={`/dash`}
            className="flex flex-col items-center p-2"
            aria-label="Go to dashboard home"
          >
            <Home size={20} />
            <span className="text-xs mt-1">Home</span>
          </Link>
        </ToolTip>
        {canSeeCourses && (
          <ToolTip content={'Courses'} slateBlack sideOffset={8} side="top">
            <Link
              href={`/dash/courses`}
              className="flex flex-col items-center p-2"
              aria-label="Manage courses"
            >
              <BookCopy size={20} />
              <span className="text-xs mt-1">Courses</span>
            </Link>
          </ToolTip>
        )}
        {canSeeAssignments && (
          <ToolTip content={'Assignments'} slateBlack sideOffset={8} side="top">
            <Link
              href={`/dash/assignments`}
              className="flex flex-col items-center p-2"
              aria-label="Manage assignments"
            >
              <Backpack size={20} />
              <span className="text-xs mt-1">Assignments</span>
            </Link>
          </ToolTip>
        )}
        {canSeeCommunications && (
          <ToolTip
            content={'Communications'}
            slateBlack
            sideOffset={8}
            side="top"
          >
            <Link
              href={`/dash/communications`}
              className="flex flex-col items-center p-2"
              aria-label="Communication Hub"
            >
              <Megaphone size={20} />
              <span className="text-xs mt-1">Comms</span>
            </Link>
          </ToolTip>
        )}
        {isAdmin && (
          <ToolTip content={'Payments'} slateBlack sideOffset={8} side="top">
            <Link
              href={`/dash/payments/customers`}
              className="flex flex-col items-center p-2"
              aria-label="Manage payments and billing"
            >
              <BadgeDollarSign size={20} />
              <span className="text-xs mt-1">Payments</span>
            </Link>
          </ToolTip>
        )}
        {canSeeUsers && (
          <ToolTip content={'Users'} slateBlack sideOffset={8} side="top">
            <Link
              href={`/dash/users/settings/users`}
              className="flex flex-col items-center p-2"
              aria-label="Manage users"
            >
              <Users size={20} />
              <span className="text-xs mt-1">Users</span>
            </Link>
          </ToolTip>
        )}
        {canSeeOrg && (
          <ToolTip
            content={'Organization'}
            slateBlack
            sideOffset={8}
            side="top"
          >
            <Link
              href={`/dash/org/settings/general`}
              className="flex flex-col items-center p-2"
              aria-label="Organization settings"
            >
              <School size={20} />
              <span className="text-xs mt-1">Org</span>
            </Link>
          </ToolTip>
        )}
        <ToolTip
          content={session.data.user.username + "'s Settings"}
          slateBlack
          sideOffset={8}
          side="top"
        >
          <Link
            href={'/dash/user-account/settings/general'}
            className="flex flex-col items-center p-2"
            aria-label="User account settings"
          >
            <Settings size={20} />
            <span className="text-xs mt-1">Settings</span>
          </Link>
        </ToolTip>
      </div>
    </div>
  )
}

export default DashMobileMenu
