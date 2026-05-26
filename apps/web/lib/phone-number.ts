export const DEFAULT_COUNTRY_CODE = '+234'

export const AFRICAN_COUNTRY_DIAL_CODES = [
  { name: 'Algeria', iso2: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Angola', iso2: 'AO', dialCode: '+244', flag: '🇦🇴' },
  { name: 'Benin', iso2: 'BJ', dialCode: '+229', flag: '🇧🇯' },
  { name: 'Botswana', iso2: 'BW', dialCode: '+267', flag: '🇧🇼' },
  { name: 'Burkina Faso', iso2: 'BF', dialCode: '+226', flag: '🇧🇫' },
  { name: 'Burundi', iso2: 'BI', dialCode: '+257', flag: '🇧🇮' },
  { name: 'Cabo Verde', iso2: 'CV', dialCode: '+238', flag: '🇨🇻' },
  { name: 'Cameroon', iso2: 'CM', dialCode: '+237', flag: '🇨🇲' },
  {
    name: 'Central African Republic',
    iso2: 'CF',
    dialCode: '+236',
    flag: '🇨🇫',
  },
  { name: 'Chad', iso2: 'TD', dialCode: '+235', flag: '🇹🇩' },
  { name: 'Comoros', iso2: 'KM', dialCode: '+269', flag: '🇰🇲' },
  { name: 'Congo', iso2: 'CG', dialCode: '+242', flag: '🇨🇬' },
  { name: 'Congo (DRC)', iso2: 'CD', dialCode: '+243', flag: '🇨🇩' },
  { name: "Cote d'Ivoire", iso2: 'CI', dialCode: '+225', flag: '🇨🇮' },
  { name: 'Djibouti', iso2: 'DJ', dialCode: '+253', flag: '🇩🇯' },
  { name: 'Egypt', iso2: 'EG', dialCode: '+20', flag: '🇪🇬' },
  {
    name: 'Equatorial Guinea',
    iso2: 'GQ',
    dialCode: '+240',
    flag: '🇬🇶',
  },
  { name: 'Eritrea', iso2: 'ER', dialCode: '+291', flag: '🇪🇷' },
  { name: 'Eswatini', iso2: 'SZ', dialCode: '+268', flag: '🇸🇿' },
  { name: 'Ethiopia', iso2: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Gabon', iso2: 'GA', dialCode: '+241', flag: '🇬🇦' },
  { name: 'Gambia', iso2: 'GM', dialCode: '+220', flag: '🇬🇲' },
  { name: 'Ghana', iso2: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Guinea', iso2: 'GN', dialCode: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', iso2: 'GW', dialCode: '+245', flag: '🇬🇼' },
  { name: 'Kenya', iso2: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Lesotho', iso2: 'LS', dialCode: '+266', flag: '🇱🇸' },
  { name: 'Liberia', iso2: 'LR', dialCode: '+231', flag: '🇱🇷' },
  { name: 'Libya', iso2: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'Madagascar', iso2: 'MG', dialCode: '+261', flag: '🇲🇬' },
  { name: 'Malawi', iso2: 'MW', dialCode: '+265', flag: '🇲🇼' },
  { name: 'Mali', iso2: 'ML', dialCode: '+223', flag: '🇲🇱' },
  { name: 'Mauritania', iso2: 'MR', dialCode: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', iso2: 'MU', dialCode: '+230', flag: '🇲🇺' },
  { name: 'Morocco', iso2: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', iso2: 'MZ', dialCode: '+258', flag: '🇲🇿' },
  { name: 'Namibia', iso2: 'NA', dialCode: '+264', flag: '🇳🇦' },
  { name: 'Niger', iso2: 'NE', dialCode: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', iso2: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Rwanda', iso2: 'RW', dialCode: '+250', flag: '🇷🇼' },
  {
    name: 'Sao Tome and Principe',
    iso2: 'ST',
    dialCode: '+239',
    flag: '🇸🇹',
  },
  { name: 'Senegal', iso2: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'Seychelles', iso2: 'SC', dialCode: '+248', flag: '🇸🇨' },
  { name: 'Sierra Leone', iso2: 'SL', dialCode: '+232', flag: '🇸🇱' },
  { name: 'Somalia', iso2: 'SO', dialCode: '+252', flag: '🇸🇴' },
  { name: 'South Africa', iso2: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'South Sudan', iso2: 'SS', dialCode: '+211', flag: '🇸🇸' },
  { name: 'Sudan', iso2: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'Tanzania', iso2: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Togo', iso2: 'TG', dialCode: '+228', flag: '🇹🇬' },
  { name: 'Tunisia', iso2: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Uganda', iso2: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Zambia', iso2: 'ZM', dialCode: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', iso2: 'ZW', dialCode: '+263', flag: '🇿🇼' },
]

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
