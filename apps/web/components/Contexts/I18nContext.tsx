'use client'

import React from 'react'
import '../../lib/i18n'
import { useTranslation } from 'react-i18next'

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { i18n } = useTranslation()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // On the server or before mounting, we don't want to do anything that might trigger the error
  // but we can just render the children. The html lang attribute is handled in layout.tsx
  return <>{children}</>
}
