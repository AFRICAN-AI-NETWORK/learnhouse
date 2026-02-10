'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
  const { isAdmin, loading } = useAdminStatus() as any
  // Derived State (No useState/useEffect needed for authorization status)
  let isAuthorized = false

  if (loading) {
    isAuthorized = false // Will return loader anyway
  } else if (!isUserAuthenticated) {
    isAuthorized = false
  } else if (authorizationMode === 'component') {
    isAuthorized = !!isAdmin
  } else if (authorizationMode === 'page') {
    if (isAdminPath) {
      isAuthorized = !!isAdmin
    } else {
      isAuthorized = true
    }
  }

  // Side Effect: Handle Redirection
  useEffect(() => {
    if (loading) return

    if (!isUserAuthenticated) {
      router.push(getUriWithoutOrg('/login?orgslug=' + org.slug))
      return
    }

    if (authorizationMode === 'page' && isAdminPath && !isAdmin) {
      router.push('/dash')
    }
  }, [
    loading,
    isUserAuthenticated,
    authorizationMode,
    isAdminPath,
    isAdmin,
    router,
    org.slug,
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
