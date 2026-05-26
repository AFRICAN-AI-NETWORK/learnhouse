export const DEFAULT_COUNTRY_CODE = '+254'

export function normalizeCountryCode(countryCode: string) {
  const digits = countryCode.replace(/\D/g, '').slice(0, 4)
  return digits ? `+${digits}` : ''
}

export function normalizeLocalPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, '')
}

export function formatE164(countryCode: string, phoneNumber: string) {
  return `${normalizeCountryCode(countryCode)}${normalizeLocalPhoneNumber(phoneNumber)}`
}

export function validatePhoneFields(values: {
  country_code?: string
  phone_number?: string
}) {
  const countryCode = normalizeCountryCode(values.country_code || '')
  const phoneNumber = normalizeLocalPhoneNumber(values.phone_number || '')
  const fullNumber = `${countryCode}${phoneNumber}`

  if (!countryCode) {
    return {
      country_code: 'Country code is required',
      phone_number: '',
    }
  }

  if (!/^\+\d{1,4}$/.test(countryCode)) {
    return {
      country_code: 'Use a valid code, e.g. +254',
      phone_number: '',
    }
  }

  if (!phoneNumber) {
    return {
      country_code: '',
      phone_number: 'Phone number is required',
    }
  }

  if (!/^\+\d{7,15}$/.test(fullNumber)) {
    return {
      country_code: '',
      phone_number: 'Invalid phone number',
    }
  }

  return {
    country_code: '',
    phone_number: '',
  }
}
