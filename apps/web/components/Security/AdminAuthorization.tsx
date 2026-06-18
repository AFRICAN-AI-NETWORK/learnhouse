'use client'
import React, { useEffect, useMemo } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useAdminStatus from '@components/Hooks/useAdminStatus'
import { usePathname, useRouter } from 'next/navigation'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import { getUriWithoutOrg } from '@services/config/config'
import { useOrg } from '@components/Contexts/OrgContext'

type AuthorizationProps = {
  children: React.ReactNode
  authorizationMode: 'component' | 'page'
}

const ADMIN_PATHS = [
  '/dash/org/*',
  '/dash/org',
  '/dash/users/*',
  '/dash/users',
  '/dash/courses/*',
  '/dash/courses',
  '/dash/org/settings/general',
]

const AdminAuthorization: React.FC<AuthorizationProps> = ({
  children,
  authorizationMode,
}) => {
  const session = useLHSession() as any
  const org = useOrg() as any
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin, loading, rights } = useAdminStatus() as any

  // Derived State (No useState/useEffect needed for authorization status)
  const { isAuthorized, isAdminPath } = useMemo(() => {
    let authorized = false
    let isPathAdmin = false

    const checkPath = (pattern: string) =>
      pathname.startsWith(
        pattern.endsWith('*') ? pattern.slice(0, -1) : pattern
      )

    // Specific granular permission checks
    if (checkPath('/dash/communications')) {
      isPathAdmin = true
      authorized = isAdmin || !!rights?.communications?.action_read
    } else if (checkPath('/dash/courses')) {
      isPathAdmin = true
      authorized = isAdmin || !!rights?.courses?.action_read
    } else if (checkPath('/dash/users')) {
      isPathAdmin = true
      authorized = isAdmin || !!rights?.users?.action_read
    } else if (checkPath('/dash/org')) {
      isPathAdmin = true
      authorized = isAdmin || !!rights?.organizations?.action_read
    } else {
      // General ADMIN_PATHS check
      const isPathInAdminList = ADMIN_PATHS.some((path) => checkPath(path))
      if (isPathInAdminList) {
        isPathAdmin = true
        authorized = isAdmin
      } else {
        authorized = true
      }
    }

    // Special case for component mode: strictly checks isAdmin or specific right if passed
    if (authorizationMode === 'component') {
      return { isAuthorized: isAdmin, isAdminPath: true }
    }

    return { isAuthorized: authorized, isAdminPath: isPathAdmin }
  }, [pathname, isAdmin, rights, authorizationMode])

  // Derived State
  const isUserAuthenticated = !!session?.data?.user

  // Side Effect: Handle Redirection
  useEffect(() => {
    if (loading) return

    if (!isUserAuthenticated) {
      router.push(getUriWithoutOrg('/login?orgslug=' + org.slug))
      return
    }

    if (authorizationMode === 'page' && isAdminPath && !isAuthorized) {
      router.push('/dash')
    }
  }, [
    loading,
    isUserAuthenticated,
    authorizationMode,
    isAdminPath,
    isAuthorized,
    router,
    org?.slug,
  ])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <PageLoading />
      </div>
    )
  }

  if (authorizationMode === 'page' && !isAuthorized) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1 className="text-2xl">You are not authorized to access this page</h1>
      </div>
    )
  }

  return <>{isAuthorized && children}</>
}

export default AdminAuthorization
