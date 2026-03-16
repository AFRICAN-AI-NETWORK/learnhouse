import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  RequestBodyFormWithAuthHeader,
  errorHandling,
} from './utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

export const createCampaign = async (
  data: any,
  token?: string,
  orgslug?: string
) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/${orgslug ? `?org_slug=${orgslug}` : ''}`,
    RequestBodyWithAuthHeader('POST', data, null, token)
  )
  return await errorHandling(result)
}

export const getCampaigns = async (token?: string, orgslug?: string) => {
  return swrFetcher(
    `${getAPIUrl()}communications/${orgslug ? `?org_slug=${orgslug}` : ''}`,
    token
  )
}

export const getCampaign = async (
  campaignId: number,
  token?: string,
  orgslug?: string
) => {
  return swrFetcher(
    `${getAPIUrl()}communications/${campaignId}${orgslug ? `?org_slug=${orgslug}` : ''}`,
    token
  )
}
export const getLiveSessions = async (token?: string, orgslug?: string) => {
  return swrFetcher(
    `${getAPIUrl()}communications/live-sessions${orgslug ? `?org_slug=${orgslug}` : ''}`,
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
    `${getAPIUrl()}communications/upload-image${orgslug ? `?org_slug=${orgslug}` : ''}`,
    RequestBodyFormWithAuthHeader('POST', formData, null, token || '')
  )
  return await errorHandling(result)
}
