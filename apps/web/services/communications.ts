import {
  swrFetcher,
  RequestBodyWithAuthHeader,
  errorHandling,
} from './utils/ts/requests'
import { getAPIUrl } from '@services/config/config'

export const createCampaign = async (data: any, token: string) => {
  const result: any = await fetch(
    `${getAPIUrl()}communications/`,
    RequestBodyWithAuthHeader('POST', data, null, token)
  )
  return await errorHandling(result)
}

export const getCampaigns = async (token?: string) => {
  return swrFetcher(`${getAPIUrl()}communications/`, token)
}

export const getCampaign = async (campaignId: number, token?: string) => {
  return swrFetcher(`${getAPIUrl()}communications/${campaignId}`, token)
}
