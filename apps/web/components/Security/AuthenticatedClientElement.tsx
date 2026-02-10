'use client'
import React, { useMemo } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'

interface AuthenticatedClientElementProps {
  children: React.ReactNode
  checkMethod: 'authentication' | 'roles'
  orgId?: string | number
  ressourceType?:
    | 'collections'
    | 'courses'
    | 'activities'
    | 'users'
    | 'organizations'
  action?: 'create' | 'update' | 'delete' | 'read'
}

function isUserAllowed(
  roles: any[],
  action: string,
  resourceType: string,
  org_uuid: string
): boolean {
  // Iterate over the user's roles
  for (const role of roles) {
    // Check if the role is for the right organization
    if (role.org.org_uuid === org_uuid) {
      // Check if the user has the role for the resource type
      if (role.role.rights && role.role.rights[resourceType]) {
        // Check if the user is allowed to execute the action
        const actionKey = `action_${action}`
        if (role.role.rights[resourceType][actionKey] === true) {
          return true
        }
      }
    }
  }

  // If no role matches the organization, resource type, and action, return false
  return false
}

export const AuthenticatedClientElement = (
  props: AuthenticatedClientElementProps
) => {
  const session = useLHSession() as any
  const org = useOrg() as any

  const roles = session?.data?.roles
  const status = session.status
  const checkMethod = props.checkMethod
  const action = props.action
  const ressourceType = props.ressourceType
  const orgUuid = org?.org_uuid

  const isAllowed = useMemo(() => {
    if (status == 'loading') {
      return false
    }

    if (status == 'unauthenticated') {
      return false
    }

    if (checkMethod === 'authentication') {
      return status == 'authenticated'
    } else if (checkMethod === 'roles') {
      return isUserAllowed(roles || [], action!, ressourceType!, orgUuid)
    }

    return false
  }, [status, roles, checkMethod, action, ressourceType, orgUuid])

  return <>{isAllowed && props.children}</>
}

export default AuthenticatedClientElement
