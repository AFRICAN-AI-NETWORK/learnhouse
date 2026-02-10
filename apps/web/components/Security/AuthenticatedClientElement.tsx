'use client'
import React from 'react'
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

  const isAllowed = (() => {
    if (session.status == 'loading') {
      return false
    }

    if (session.status == 'unauthenticated') {
      return false
    }

    if (props.checkMethod === 'authentication') {
      return session.status == 'authenticated'
    } else if (props.checkMethod === 'roles') {
      return isUserAllowed(
        session?.data?.roles || [],
        props.action!,
        props.ressourceType!,
        org?.org_uuid
      )
    }

    return false
  })()

  return <>{isAllowed && props.children}</>
}

export default AuthenticatedClientElement
