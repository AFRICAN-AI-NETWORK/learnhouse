import React, { useId } from 'react'
import * as Form from '@radix-ui/react-form'
import {
  FormField,
  FormLabelAndMessage,
  Input,
} from '@components/Objects/StyledElements/Form/Form'
import {
  AFRICAN_COUNTRY_DIAL_CODES,
  normalizeLocalPhoneNumber,
} from '@/lib/phone-number'

type PhoneNumberFieldsProps = {
  formik: any
  countryCodeLabel?: string
  phoneNumberLabel?: string
}

function getCountryCodeOption(country: (typeof AFRICAN_COUNTRY_DIAL_CODES)[number]) {
  return `${country.flag} ${country.name} ${country.dialCode}`
}

export default function PhoneNumberFields({
  formik,
  countryCodeLabel = 'Country code',
  phoneNumberLabel = 'Phone number',
}: PhoneNumberFieldsProps) {
  const countryCodesListId = useId()

  return (
    <div>
      <div className="grid grid-cols-[minmax(128px,0.48fr)_1fr] gap-3">
        <FormField name="country_code">
          <FormLabelAndMessage label={countryCodeLabel} />
          <Form.Control asChild>
            <Input
              className={`h-12 focus:ring-2 focus:ring-black/5 transition-shadow ${formik.errors.country_code && formik.touched.country_code ? 'border-red-400' : ''}`}
              onChange={(e) =>
                formik.setFieldValue('country_code', e.target.value)
              }
              onBlur={formik.handleBlur}
              value={formik.values.country_code}
              type="text"
              inputMode="tel"
              list={countryCodesListId}
              required
              placeholder="🇳🇬 Nigeria +234"
            />
          </Form.Control>
          <datalist id={countryCodesListId}>
            {AFRICAN_COUNTRY_DIAL_CODES.map((country) => (
              <option
                key={country.iso2}
                value={getCountryCodeOption(country)}
              />
            ))}
          </datalist>
        </FormField>

        <FormField name="phone_number">
          <FormLabelAndMessage label={phoneNumberLabel} />
          <Form.Control asChild>
            <Input
              className={`h-12 focus:ring-2 focus:ring-black/5 transition-shadow ${formik.errors.phone_number && formik.touched.phone_number ? 'border-red-400' : formik.values.phone_number && !formik.errors.phone_number ? 'border-emerald-500 focus:ring-emerald-500/10' : ''}`}
              onChange={(e) =>
                formik.setFieldValue(
                  'phone_number',
                  normalizeLocalPhoneNumber(e.target.value)
                )
              }
              onBlur={formik.handleBlur}
              value={formik.values.phone_number}
              type="tel"
              inputMode="numeric"
              required
              placeholder="8012345678"
            />
          </Form.Control>
        </FormField>
      </div>
      {(formik.errors.country_code || formik.errors.phone_number) &&
        (formik.touched.country_code || formik.touched.phone_number) && (
          <p className="mt-1 text-xs text-red-600 font-medium">
            {formik.errors.country_code || formik.errors.phone_number}
          </p>
        )}
    </div>
  )
}
