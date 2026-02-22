import { getAPIUrl } from '@services/config/config'

export const getPublicProducts = async (orgId: string | number) => {
  const response = await fetch(
    `${getAPIUrl()}payments/${orgId}/public-products`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh pricing data
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch public products')
  }

  return response.json()
}
