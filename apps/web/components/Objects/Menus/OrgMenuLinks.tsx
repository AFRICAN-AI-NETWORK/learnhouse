import { getUriWithOrg } from '@services/config/config'
import {
  BookCopy,
  Signpost,
  SquareLibrary,
  CreditCard,
  MessageSquare,
  LayoutDashboard,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { useTranslation } from 'react-i18next'

function MenuLinks(props: {
  orgslug: string
  variant?: 'top' | 'sidebar'
  collapsed?: boolean
}) {
  const variant = props.variant || 'top'
  const isSidebar = variant === 'sidebar'

  return (
    <div className={isSidebar ? 'w-full' : 'pl-1'}>
      <ul
        className={
          isSidebar ? 'flex w-full flex-col gap-1.5' : 'flex space-x-5'
        }
      >
        {isSidebar && (
          <LinkItem
            link="/"
            type="dashboard"
            orgslug={props.orgslug}
            variant={variant}
            collapsed={props.collapsed}
          />
        )}
        <LinkItem
          link="/courses"
          type="courses"
          orgslug={props.orgslug}
          variant={variant}
          collapsed={props.collapsed}
        />
        {/* <LinkItem
          link="/collections"
          type="collections"
          orgslug={props.orgslug}
          variant={variant}
          collapsed={props.collapsed}
        /> */}
        <LinkItem
          link="/chat"
          type="chat"
          orgslug={props.orgslug}
          variant={variant}
          collapsed={props.collapsed}
        />
        <LinkItem
          link="/pricing"
          type="pricing"
          orgslug={props.orgslug}
          variant={variant}
          collapsed={props.collapsed}
        />
        <LinkItem
          link="/contact"
          type="contact"
          orgslug={props.orgslug}
          variant={variant}
          collapsed={props.collapsed}
        />
        {/* <AuthenticatedClientElement checkMethod="authentication">
          <LinkItem
            link="/trail"
            type="trail"
            orgslug={props.orgslug}
            variant={variant}
            collapsed={props.collapsed}
          />
        </AuthenticatedClientElement> */}
      </ul>
    </div>
  )
}
const LinkItem = (props: any) => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const link = props.link
  const orgslug = props.orgslug
  const isSidebar = props.variant === 'sidebar'
  const isCollapsed = isSidebar && props.collapsed
  const href = getUriWithOrg(orgslug, link)
  const isActive =
    link === '/'
      ? pathname === href || pathname === getUriWithOrg(orgslug, '')
      : pathname?.startsWith(href)

  return (
    <Link
      href={href}
      className={isSidebar ? 'block w-full' : undefined}
      title={isCollapsed ? getLabel(props.type, t) : undefined}
    >
      <li
        className={
          isSidebar
            ? `flex w-full items-center rounded-lg py-3 text-sm font-medium transition-colors ${
                isCollapsed
                  ? 'justify-center px-2'
                  : 'justify-start gap-3 px-3.5'
              } ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-white/60 dark:hover:bg-white/6 dark:hover:text-white'
              }`
            : 'flex space-x-2 items-center text-[#909192] dark:text-white/55 dark:hover:text-white font-medium'
        }
      >
        {props.type == 'dashboard' && (
          <>
            <LayoutDashboard size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>
              Dashboard
            </span>
          </>
        )}
        {props.type == 'courses' && (
          <>
            <BookCopy size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>
              {t('courses.courses')}
            </span>
          </>
        )}
        {props.type == 'collections' && (
          <>
            <SquareLibrary size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>
              {t('collections.collections')}
            </span>
          </>
        )}
        {props.type == 'chat' && (
          <>
            <MessageSquare size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>
              {t('chat.chat')}
            </span>
          </>
        )}
        {props.type == 'trail' && (
          <>
            <Signpost size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>
              {t('courses.progress')}
            </span>
          </>
        )}
        {props.type == 'pricing' && (
          <>
            <CreditCard size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>Pricing</span>
          </>
        )}
        {props.type == 'contact' && (
          <>
            <MessageSquare size={20} className="shrink-0" />{' '}
            <span className={isCollapsed ? 'sr-only' : undefined}>Contact</span>
          </>
        )}
      </li>
    </Link>
  )
}

const getLabel = (type: string, t: any) => {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    courses: t('courses.courses'),
    collections: t('collections.collections'),
    chat: t('chat.chat'),
    trail: t('courses.progress'),
    pricing: 'Pricing',
    contact: 'Contact',
  }

  return labels[type] || ''
}
export default MenuLinks
