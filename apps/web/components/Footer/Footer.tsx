'use client'

import React from 'react'
import OrgScripts from '@/components/OrgScripts/OrgScripts'
import { usePathname } from 'next/navigation'

import { useLHSession } from '@components/Contexts/LHSessionContext'
import Link from 'next/link'

const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto">
      <OrgScripts />
    </footer>
  )
}

export default Footer
