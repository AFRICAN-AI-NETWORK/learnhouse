'use server'
import { getAPIUrl } from '@services/config/config'
import {
  RequestBodyWithAuthHeader,
  getResponseMetadata,
} from '@services/utils/ts/requests'

/**
 * Validate a discount code for a specific course and amount.
 * Returns discount details and final amount if valid.
 */
export async function validateDiscountCode(
  orgId: number,
  code: string,
  amount: number,
  access_token: string,
  courseId?: number,
  productId?: number
) {
  let url = `${getAPIUrl()}payments/${orgId}/validate-discount?code=${encodeURIComponent(code)}&amount=${amount}`
  if (courseId) url += `&course_id=${courseId}`
  if (productId) url += `&product_id=${productId}`

  const result = await fetch(
    url,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

/**
 * List all discount codes for an organization.
 * Instructors see only their own course-linked codes.
 */
export async function listDiscountCodes(
  orgId: number,
  access_token: string,
  includeInactive: boolean = false
) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/discount-codes?include_inactive=${includeInactive}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

/**
 * Create a new discount code.
 */
export async function createDiscountCode(
  orgId: number,
  data: any,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/discount-codes`,
    RequestBodyWithAuthHeader('POST', data, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

/**
 * Update an existing discount code.
 */
export async function updateDiscountCode(
  orgId: number,
  codeId: number,
  data: any,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/discount-codes/${codeId}`,
    RequestBodyWithAuthHeader('PATCH', data, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

/**
 * Deactivate a discount code.
 */
export async function deactivateDiscountCode(
  orgId: number,
  codeId: number,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/discount-codes/${codeId}/deactivate`,
    RequestBodyWithAuthHeader('POST', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}

/**
 * Get usage analytics for a specific discount code.
 */
export async function getDiscountAnalytics(
  orgId: number,
  codeId: number,
  access_token: string
) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/discount-codes/${codeId}/analytics`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  )
  const res = await getResponseMetadata(result)
  return res
}
