'use client'
import africanAiLogo from 'public/african_ai_horizontal.png'
import Image from 'next/image'
import Link from 'next/link'
import { getUriWithOrg, getUriWithoutOrg } from '@services/config/config'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import React, { useEffect } from 'react'
import { MailWarning, Ticket, UserPlus } from 'lucide-react'
import { useOrg } from '@components/Contexts/OrgContext'
import UserAvatar from '@components/Objects/UserAvatar'
import OpenSignUpComponent from './OpenSignup'
import InviteOnlySignUpComponent from './InviteOnlySignUp'
import WaitlistSignUpComponent from './WaitlistSignUp'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateInviteCode } from '@services/organizations/invites'
import { getOrgWaitlists } from '@services/waitlist/waitlist'
import toast from 'react-hot-toast'
import { BarLoader } from 'react-spinners'
import { joinOrg } from '@services/organizations/orgs'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'

interface SignUpClientProps {
  org: any
}

interface WaitlistCampaign {
  waitlist_uuid: string
  name?: string
  description?: string | null
  status?: string
}

function SignUpClient(props: SignUpClientProps) {
  const { t } = useTranslation()
  const session = useLHSession() as any
  const joinMethod =
    props.org?.config?.config?.features?.members?.signup_mode || 'open'
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('inviteCode') || ''
  const waitlistUuid = searchParams.get('waitlist_uuid') || ''
  const [resolvedWaitlistUuid, setResolvedWaitlistUuid] =
    React.useState(waitlistUuid)
  const [selectedCampaignName, setSelectedCampaignName] = React.useState('')

  const handleWaitlistSelect = React.useCallback(
    (selectedWaitlistUuid: string, campaignName?: string) => {
      setResolvedWaitlistUuid(selectedWaitlistUuid)
      setSelectedCampaignName(campaignName || '')
    },
    []
  )

  useEffect(() => {
    setResolvedWaitlistUuid(waitlistUuid)
    if (waitlistUuid) {
      setSelectedCampaignName('')
    }
  }, [waitlistUuid])

  const getSubtitle = () => {
    if (joinMethod === 'open') return t('auth.create_your_account_in_steps')
    if (joinMethod === 'waitlist') return 'Join the waitlist'
    if (inviteCode) return t('auth.invited_to_join')
    return t('auth.invite_code_required')
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center overflow-y-auto bg-slate-50/50">
      <div className="w-full md:w-[500px] py-12 px-6">
        <div className="flex justify-between items-center mb-8">
          <Link href={getUriWithOrg(props.org?.slug, '/')}>
            <Image
              quality={100}
              width={160}
              src={africanAiLogo}
              alt="African AI Network"
              className="w-auto h-8 hover:opacity-80 transition-opacity"
            />
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {t('auth.create_account')}
            </h1>
            {getSubtitle() && (
              <p className="text-sm text-slate-500 italic">{getSubtitle()}</p>
            )}
          </div>

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
            {joinMethod === 'waitlist' &&
              (resolvedWaitlistUuid ? (
                <>
                  <SelectedWaitlistNotice campaignName={selectedCampaignName} />
                  <WaitlistSignUpComponent
                    waitlistUuid={resolvedWaitlistUuid}
                  />
                </>
              ) : (
                <WaitlistCampaignSelector
                  orgId={props.org?.id}
                  orgSlug={props.org?.slug}
                  accessToken={session?.data?.tokens?.access_token}
                  onSelect={handleWaitlistSelect}
                />
              ))}
          </div>

          <p className="text-center text-xs text-slate-500 pt-4 border-t border-slate-50">
            {t('auth.already_have_an_account')}{' '}
            <Link
              href={`/login?orgslug=${props.org?.slug}`}
              className="font-bold text-black hover:underline"
            >
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
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
    const res = await joinOrg(
      {
        org_id: org.id,
        user_id: session?.data?.user?.id,
        invite_code: props.inviteCode,
      },
      null,
      session.data?.tokens?.access_token
    )
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
        <div className="flex items-center justify-center gap-4">
          <UserAvatar rounded="rounded-xl" border="border-2" width={48} />
          <p className="text-slate-600 font-medium">
            Ready to join{' '}
            <span className="text-black font-bold">{org?.name}</span>?
          </p>
        </div>
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
            <span>
              {t('auth.join')} {org?.name}
            </span>
          </>
        )}
      </button>
    </div>
  )
}

const NoTokenScreen = () => {
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
    let res = await validateInviteCode(
      org?.id,
      inviteCode,
      session?.user?.tokens.access_token
    )
    if (res.success) {
      toast.success(t('auth.invite_code_valid'))
      setTimeout(() => {
        router.push(
          getUriWithoutOrg(
            `/signup?inviteCode=${inviteCode}&orgslug=${org.slug}`
          )
        )
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
        <h3 className="text-xl font-bold text-slate-900">
          {t('auth.invite_code_required')}
        </h3>
        <p className="text-slate-500 text-sm italic">{org?.name}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="relative group">
          <Ticket
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-black transition-colors"
            size={18}
          />
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

const WaitlistNotFoundScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="bg-amber-50 p-4 rounded-2xl inline-flex mb-2">
          <MailWarning size={32} className="text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Waitlist is temporarily unavailable
        </h3>
        <p className="text-slate-500 text-sm max-w-sm">
          We couldn&apos;t find an active waitlist campaign right now.
        </p>
      </div>

      <p className="text-center text-sm text-slate-600 max-w-sm">
        Please check back shortly, or contact the organization for a direct
        invite link.
      </p>
    </div>
  )
}

const WaitlistCampaignSelector = ({
  orgId,
  orgSlug,
  accessToken,
  onSelect,
}: {
  orgId: number | undefined
  orgSlug: string | undefined
  accessToken?: string
  onSelect: (waitlistUuid: string, campaignName?: string) => void
}) => {
  const [isLoadingCampaigns, setIsLoadingCampaigns] = React.useState(true)
  const [campaigns, setCampaigns] = React.useState<WaitlistCampaign[]>([])
  const [selectedUuid, setSelectedUuid] = React.useState('')
  const [loadFailed, setLoadFailed] = React.useState(false)

  useEffect(() => {
    const loadCampaigns = async () => {
      if (!orgId) {
        setLoadFailed(true)
        setIsLoadingCampaigns(false)
        return
      }

      try {
        const res = await getOrgWaitlists(orgId, accessToken)
        if (res.success && Array.isArray(res.data)) {
          const activeCampaigns = res.data.filter(
            (campaign: WaitlistCampaign) =>
              campaign?.waitlist_uuid &&
              (campaign?.status || '').toUpperCase() === 'ACTIVE'
          )

          if (activeCampaigns.length === 1) {
            onSelect(
              activeCampaigns[0].waitlist_uuid,
              activeCampaigns[0].name || 'Waitlist Campaign'
            )
            return
          }

          if (activeCampaigns.length > 1) {
            setCampaigns(activeCampaigns)
            setSelectedUuid(activeCampaigns[0].waitlist_uuid)
            return
          }
        }

        setLoadFailed(true)
      } catch {
        setLoadFailed(true)
      } finally {
        setIsLoadingCampaigns(false)
      }
    }

    loadCampaigns()
  }, [orgId, accessToken, onSelect])

  if (isLoadingCampaigns) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-8">
        <p className="text-sm text-slate-500">Preparing waitlist options...</p>
        <BarLoader width={80} color="#111827" />
      </div>
    )
  }

  if (loadFailed || campaigns.length === 0) {
    return <WaitlistNotFoundScreen />
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-900">
          Choose a waitlist campaign
        </h3>
        <p className="text-slate-500 text-sm">
          Select the campaign you want to join for{' '}
          {orgSlug || 'this organization'}.
        </p>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => {
          const isSelected = selectedUuid === campaign.waitlist_uuid
          return (
            <button
              key={campaign.waitlist_uuid}
              onClick={() => setSelectedUuid(campaign.waitlist_uuid)}
              className={`w-full text-left border rounded-xl p-4 transition-all ${
                isSelected
                  ? 'border-black bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              type="button"
            >
              <p className="font-semibold text-slate-900">
                {campaign.name || 'Waitlist Campaign'}
              </p>
              {campaign.description ? (
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                  {campaign.description}
                </p>
              ) : null}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => {
          if (!selectedUuid) return
          const selectedCampaign = campaigns.find(
            (campaign) => campaign.waitlist_uuid === selectedUuid
          )
          onSelect(selectedUuid, selectedCampaign?.name || 'Waitlist Campaign')
        }}
        disabled={!selectedUuid}
        className="flex w-full justify-center items-center gap-3 bg-black text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-black/10 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
        type="button"
      >
        Continue to waitlist signup
      </button>
    </div>
  )
}

const SelectedWaitlistNotice = ({ campaignName }: { campaignName: string }) => {
  if (!campaignName) {
    return null
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      You&apos;re joining <span className="font-semibold">{campaignName}</span>.
    </div>
  )
}

export default SignUpClient
