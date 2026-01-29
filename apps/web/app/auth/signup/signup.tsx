'use client'
import africanAiLogo from 'public/african_ai_horizontal.png'
import Image from 'next/image'
import { getOrgLogoMediaDirectory } from '@services/media/media'
import Link from 'next/link'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import React, { useEffect } from 'react'
import { MailWarning, Ticket, UserPlus } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import UserAvatar from '@components/Objects/UserAvatar'
import OpenSignUpComponent from './OpenSignup'
import InviteOnlySignUpComponent from './InviteOnlySignUp'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateInviteCode } from '@services/organizations/invites'
import PageLoading from '@components/Objects/Loaders/PageLoading'
import Toast from '@components/Objects/StyledElements/Toast/Toast'
import toast from 'react-hot-toast'
import { BarLoader } from 'react-spinners'
import { joinOrg } from '@services/organizations/orgs'
import { useTranslation } from 'react-i18next'

interface SignUpClientProps {
  org: any
}

import AuthSplitLayout from '../components/AuthSplitLayout'

function SignUpClient(props: SignUpClientProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const [joinMethod, setJoinMethod] = React.useState('open')
  const [inviteCode, setInviteCode] = React.useState('')
  const searchParams = useSearchParams()
  const inviteCodeParam = searchParams.get('inviteCode')

  useEffect(() => {
    if (props.org.config) {
      setJoinMethod(
        props.org?.config?.config?.features.members.signup_mode
      )
    }
    if (inviteCodeParam) {
      setInviteCode(inviteCodeParam)
    }
  }, [props.org, inviteCodeParam])

  const getSubtitle = () => {
    if (joinMethod === 'open') return t('auth.create_your_account_in_steps')
    if (inviteCode) return t('auth.invited_to_join')
    return t('auth.invite_code_required')
  }

  return (
    <AuthSplitLayout
      org={props.org}
      title={t('auth.create_account')}
      subtitle={getSubtitle()}
    >
      <div className="w-full">
        {joinMethod === 'open' &&
          (session.status === 'authenticated' ? (
            <LoggedInJoinScreen inviteCode={inviteCode} />
          ) : (
            <OpenSignUpComponent />
          ))}
        {joinMethod === 'inviteOnly' &&
          (inviteCode ? (
            session.status === 'authenticated' ? (
              <LoggedInJoinScreen inviteCode={inviteCode} />
            ) : (
              <InviteOnlySignUpComponent inviteCode={inviteCode} />
            )
          ) : (
            <NoTokenScreen />
          ))}
      </div>
    </AuthSplitLayout>
  )
}

const LoggedInJoinScreen = (props: any) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const [isSumbitting, setIsSubmitting] = React.useState(false)
  const router = useRouter()

  const join = async () => {
    setIsSubmitting(true)
    const res = await joinOrg({ org_id: org.id, user_id: session?.data?.user?.id, invite_code: props.inviteCode }, null, session.data?.tokens?.access_token)
    if (res.success) {
      toast.success(res.data)
      setTimeout(() => {
        router.push(getUriWithOrg(org.slug, '/'))
      }, 2000)
      setIsSubmitting(false)
    } else {
      toast.error(res.data.detail)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <p className="text-2xl font-bold text-slate-900">
          {t('common.hi')}, {session.data.username}!
        </p>
        </p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <UserAvatar rounded="rounded-xl" border="border-2" width={48} />
        <p className="text-slate-600 font-medium">Ready to join <span className="text-black font-bold">{org?.name}</span>?</p>
      </div>
      <button
        onClick={() => join()}
        disabled={isSumbitting}
        className="flex items-center justify-center gap-3 w-64 bg-black text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isSumbitting ? (
          <BarLoader width={60} color="#ffffff" />
        ) : (
          <>
            <UserPlus size={20} />
            <span>{t('auth.join')} {org?.name}</span>
          </>
        )}
      </button>
    </div >
  )
}

const NoTokenScreen = (props: any) => {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const org = useOrg() as any
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)
  const [inviteCode, setInviteCode] = React.useState('')

  const handleInviteCodeChange = (e: any) => {
    setInviteCode(e.target.value)
  }

  const validateCode = async () => {
    setIsLoading(true)
    let res = await validateInviteCode(org?.id, inviteCode, session?.user?.tokens.access_token)
    if (res.success) {
      toast.success(t('auth.invite_code_valid'))
      setTimeout(() => {
        router.push(getUriWithoutOrg(`/signup?inviteCode=${inviteCode}&orgslug=${org.slug}`))
      }, 2000)
    } else {
      toast.error(t('auth.invite_code_invalid'))
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="bg-rose-50 p-4 rounded-2xl inline-flex mb-4">
          <MailWarning size={32} className="text-rose-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">{t('auth.invite_code_required')}</h3>
        <p className="text-slate-500 text-sm italic">{org?.name}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="relative group">
          <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors" size={18} />
          <input
            onChange={handleInviteCodeChange}
            className="w-full bg-slate-50 border border-slate-200 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-12 py-4 transition-all outline-none text-slate-900 font-medium"
            placeholder={t('auth.enter_invite_code')}
            type="text"
          />
        </div>

        <button
          onClick={validateCode}
          disabled={isLoading || !inviteCode}
          className="flex w-full justify-center items-center gap-3 bg-black text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isLoading ? (
            <BarLoader width={60} color="#ffffff" />
          ) : (
            <>
              <Ticket size={20} />
              <span>{t('common.submit')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default SignUpClient
