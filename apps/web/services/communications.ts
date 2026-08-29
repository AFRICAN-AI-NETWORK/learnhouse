import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  RequestBodyFormWithAuthHeader,
  errorHandling,
} from './utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

export type CampaignType = 'COURSE_MARKETING' | 'GENERAL'
export type CampaignTargetType =
  | 'ALL'
  | 'WAITLIST'
  | 'COURSE'
  | 'ROLES'
  | 'CUSTOM_EMAILS'

export type CampaignSection =
  | {
      type: 'header'
      headline: string
      body: string
      image_url?: string
    }
  | {
      type: 'text'
      heading?: string
      body: string
    }
  | {
      type: 'course'
      course_uuid: string
      title: string
      description: string
      image_url?: string
      cta_label: string
      cta_url: string
    }
  | {
      type: 'image'
      image_url: string
      alt_text: string
    }
  | {
      type: 'button'
      label: string
      url: string
    }
  | {
      type: 'footer'
      closing_text: string
      community_link?: string
    }

export type CampaignContentJson = {
  sections: CampaignSection[]
}

export type CampaignPayload = {
  subject: string
  target_type: CampaignTargetType
  target_metadata: Record<string, unknown>
  campaign_type: CampaignType
  preheader?: string
  sender_name?: string
  reply_to_email?: string
  content_json: CampaignContentJson
  scheduled_at?: string | null
}

const getOrgQuery = (orgslug?: string) =>
  orgslug ? `?org_slug=${encodeURIComponent(orgslug)}` : ''

const getOrgQueryWithParams = (
  orgslug?: string,
  params?: Record<string, string | undefined>
) => {
  const query = new URLSearchParams()
  if (orgslug) query.set('org_slug', orgslug)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export const createCampaign = async (
  data: any,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/${getOrgQuery(orgslug)}`,
    RequestBodyWithAuthHeader('POST', data, null, token)
  )
  return await errorHandling(result)
}

export const createCampaignDraft = async (
  data: CampaignPayload,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/drafts${getOrgQuery(orgslug)}`,
    RequestBodyWithAuthHeader('POST', data, null, token)
  )
  return await errorHandling(result)
}

export const updateCampaign = async (
  campaignId: number | string,
  data: Partial<CampaignPayload>,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/${campaignId}${getOrgQuery(orgslug)}`,
    RequestBodyWithAuthHeader('PATCH', data, null, token)
  )
  return await errorHandling(result)
}

export const sendCampaignNow = async (
  campaignId: number | string,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/${campaignId}/send${getOrgQuery(orgslug)}`,
    RequestBodyWithAuthHeader('POST', null, null, token)
  )
  return await errorHandling(result)
}

export const cancelCampaign = async (
  campaignId: number | string,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/${campaignId}/cancel${getOrgQuery(orgslug)}`,
    RequestBodyWithAuthHeader('POST', null, null, token)
  )
  return await errorHandling(result)
}

export const getCampaigns = async (token?: string, orgslug?: string) => {
  return swrFetcher(
    `${getAPIUrl()}communications/${getOrgQuery(orgslug)}`,
    token
  )
}

export const getCampaign = async (
  campaignId: number,
  token?: string,
  orgslug?: string
) => {
  return swrFetcher(
    `${getAPIUrl()}communications/${campaignId}${getOrgQuery(orgslug)}`,
    token
  )
}

export const getCampaignRecipients = async (
  campaignId: number | string,
  token?: string,
  orgslug?: string,
  status?: string
) => {
  return swrFetcher(
    `${getAPIUrl()}communications/${campaignId}/recipients${getOrgQueryWithParams(
      orgslug,
      { status }
    )}`,
    token
  )
}

export const getLiveSessions = async (token?: string, orgslug?: string) => {
  return swrFetcher(
    `${getAPIUrl()}communications/live-sessions${getOrgQuery(orgslug)}`,
    token
  )
}

export const uploadCampaignImage = async (
  file: File,
  token?: string,
  orgslug?: string
) => {
  const formData = new FormData()
  formData.append('image_file', file)
  const result = await fetch(
    `${getAPIUrl()}communications/upload-image${getOrgQuery(orgslug)}`,
    RequestBodyFormWithAuthHeader('POST', formData, null, token || '')
  )
  return await errorHandling(result)
}
