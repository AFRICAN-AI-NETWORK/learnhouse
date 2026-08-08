import { RequestBodyWithAuthHeader } from '@services/utils/ts/requests'
import { getAPIUrl } from '@services/config/config'
import { getResponseMetadata } from '@services/utils/ts/requests'
import { getConnectionStatus } from '@/lib/offline/connection'
import { CONNECTION_STATUS } from '@/lib/offline/constants'
import { isOfflineReadEnabled } from '@/lib/offline/config'
import {
  searchOfflineContent,
  mergeSearchResults,
} from '@/lib/offline/offline-search'

export async function searchOrgContent(
  org_slug: string,
  query: string,
  page: number = 1,
  limit: number = 10,
  next: any,
  access_token?: any
) {
  const offlineCapable = isOfflineReadEnabled()
  const isOffline =
    offlineCapable && getConnectionStatus() === CONNECTION_STATUS.OFFLINE

  // Offline: serve a substring match over cached content instead of erroring.
  if (isOffline) {
    const cached = await searchOfflineContent(query, limit)
    return {
      success: true,
      status: 200,
      HTTPmessage: 'OK (offline)',
      data: cached,
    }
  }

  const result: any = await fetch(
    `${getAPIUrl()}search/org_slug/${org_slug}?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    RequestBodyWithAuthHeader('GET', null, next, access_token)
  )
  const res = await getResponseMetadata(result)

  // Online results are authoritative; cached-only matches are appended so a
  // downloaded course stays findable even if the server paginated it away.
  if (offlineCapable && res.success && Array.isArray(res.data)) {
    const cached = await searchOfflineContent(query, limit)
    return { ...res, data: mergeSearchResults(res.data, cached) }
  }

  return res
}
