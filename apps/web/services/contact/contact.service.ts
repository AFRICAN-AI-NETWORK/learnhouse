import { getAPIUrl } from '@services/config/config'
import { RequestBody, errorHandling } from '@services/utils/ts/requests'
import type { ContactForm, ContactApiResponse } from '@/types/contact'

export async function sendContactForm(
  form: ContactForm
): Promise<ContactApiResponse> {
  const url = `${getAPIUrl()}contact/contact`
  const result = await fetch(url, RequestBody('POST', form, null))
  return await errorHandling(result)
}
