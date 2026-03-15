import { request } from '../utils/ts/requests'

export const createCampaign = async (data: any) => {
  return request({
    url: `/communications/`,
    method: 'POST',
    data,
  })
}

export const getCampaigns = async () => {
  return request({
    url: `/communications/`,
    method: 'GET',
  })
}

export const getCampaign = async (campaignId: number) => {
  return request({
    url: `/communications/${campaignId}`,
    method: 'GET',
  })
}
