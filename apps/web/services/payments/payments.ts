'use server';
import { getAPIUrl } from '@services/config/config';
import { RequestBodyWithAuthHeader, errorHandling } from '@services/utils/ts/requests';

export async function getPaymentConfigs(orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/config`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function checkPaidAccess(courseId: number, orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/courses/${courseId}/access`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function initializePaymentConfig(orgId: number, data: any, provider: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/config?provider=${provider}`,
    RequestBodyWithAuthHeader('POST', data, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function updatePaymentConfig(orgId: number, data: any, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/config`,
    RequestBodyWithAuthHeader('PUT', data, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function updatePaymentAccountID(orgId: number, data: any, access_token: string) {
  // Update the provider_specific_id in the payments config
  const updateData = {
    provider_specific_id: data.account_id,
    active: true,
  };
  return updatePaymentConfig(orgId, updateData, access_token);
}

export async function getPaymentOnboardingLink(orgId: number, access_token: string, redirect_uri: string) {
  // This is no longer used for Paystack as it uses a manual setup
  // But we return a dummy to not break the UI immediately 
  return { connect_url: '' };
}

export async function verifyPaymentConnection(orgId: number, code: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/stripe/oauth/callback?code=${code}&org_id=${orgId}`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function deletePaymentConfig(orgId: number, id: string, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/config?id=${id}`,
    RequestBodyWithAuthHeader('DELETE', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function getOrgCustomers(orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/customers`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}

export async function getOwnedCourses(orgId: number, access_token: string) {
  const result = await fetch(
    `${getAPIUrl()}payments/${orgId}/courses/owned`,
    RequestBodyWithAuthHeader('GET', null, null, access_token)
  );
  const res = await errorHandling(result);
  return res;
}