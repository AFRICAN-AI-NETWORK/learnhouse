'use client'
import React, { useState } from 'react'
import { useFormik } from 'formik'
import {
  AlertTriangle,
  CheckCircle2,
  LucideLoader2,
  SendHorizontal,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { requestPayout } from '@services/referral/referral.service'
import type { CommissionBalance, PayoutRequestPayload } from 'types/referral'

interface RequestPayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: CommissionBalance | null
  access_token: string
}

interface PayoutFormValues {
  amount: string
  bank_name: string
  account_number: string
  account_holder: string
  account_type: string
  country_code: string
  confirmed: boolean
}

function validate(values: PayoutFormValues, maxAmount: number) {
  const errors: Partial<Record<keyof PayoutFormValues, string>> = {}

  const amount = parseFloat(values.amount)
  if (!values.amount) {
    errors.amount = 'Amount is required'
  } else if (isNaN(amount) || amount < 1) {
    errors.amount = 'Minimum payout is $1'
  } else if (amount > maxAmount) {
    errors.amount = `Cannot exceed your eligible balance of $${maxAmount.toFixed(2)}`
  }

  if (!values.bank_name.trim()) errors.bank_name = 'Bank name is required'
  if (!values.account_number.trim())
    errors.account_number = 'Account number is required'
  if (!values.account_holder.trim())
    errors.account_holder = 'Account holder name is required'
  if (!values.account_type.trim())
    errors.account_type = 'Account type is required'
  if (!values.country_code.trim())
    errors.country_code = 'Country code is required'
  if (!values.confirmed) errors.confirmed = 'Please confirm the payout details'

  return errors
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-600 font-medium">{msg}</p>
}

function RequestPayoutModal({
  open,
  onOpenChange,
  balance,
  access_token,
}: RequestPayoutModalProps) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const maxAmount = balance?.eligible_balance ?? 0

  const formik = useFormik<PayoutFormValues>({
    initialValues: {
      amount: '',
      bank_name: '',
      account_number: '',
      account_holder: '',
      account_type: '',
      country_code: '',
      confirmed: false,
    },
    validate: (values) => validate(values, maxAmount),
    onSubmit: async (values, helpers) => {
      setServerError('')
      const payload: PayoutRequestPayload = {
        amount: parseFloat(values.amount),
        bank_name: values.bank_name,
        account_number: values.account_number,
        account_holder: values.account_holder,
        account_type: values.account_type,
        country_code: values.country_code.toUpperCase(),
      }
      const result = await requestPayout(payload, access_token)
      if (result.success) {
        setSuccess(true)
        helpers.resetForm()
      } else {
        setServerError(
          result.error ?? 'Payout request failed. Please try again.'
        )
      }
    },
  })

  const handleClose = (open: boolean) => {
    if (!open) {
      formik.resetForm()
      setServerError('')
      setSuccess(false)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Enter your bank details to withdraw your eligible commission
            balance.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-4 text-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-800">Payout Requested!</h3>
            <p className="text-sm text-gray-500">
              Your payout request has been submitted. You will be notified when
              it is processed.
            </p>
            <button
              onClick={() => handleClose(false)}
              className="mt-2 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
            {serverError && (
              <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-3 text-rose-900 border border-rose-200 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Amount */}
            <div>
              <Label htmlFor="payout-amount" className="text-sm font-medium">
                Amount (USD)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <Input
                  id="payout-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={`Max: $${maxAmount.toFixed(2)}`}
                  className="pl-7"
                  value={formik.values.amount}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              <FieldError
                msg={formik.touched.amount ? formik.errors.amount : undefined}
              />
            </div>

            {/* Bank Name */}
            <div>
              <Label htmlFor="payout-bank" className="text-sm font-medium">
                Bank Name
              </Label>
              <Input
                id="payout-bank"
                name="bank_name"
                placeholder="e.g. Standard Bank"
                className="mt-1"
                value={formik.values.bank_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <FieldError
                msg={
                  formik.touched.bank_name ? formik.errors.bank_name : undefined
                }
              />
            </div>

            {/* Account Number */}
            <div>
              <Label htmlFor="payout-acct" className="text-sm font-medium">
                Account Number
              </Label>
              <Input
                id="payout-acct"
                name="account_number"
                placeholder="e.g. 0001234567"
                className="mt-1"
                value={formik.values.account_number}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <FieldError
                msg={
                  formik.touched.account_number
                    ? formik.errors.account_number
                    : undefined
                }
              />
            </div>

            {/* Account Holder */}
            <div>
              <Label htmlFor="payout-holder" className="text-sm font-medium">
                Account Holder Name
              </Label>
              <Input
                id="payout-holder"
                name="account_holder"
                placeholder="Full legal name"
                className="mt-1"
                value={formik.values.account_holder}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <FieldError
                msg={
                  formik.touched.account_holder
                    ? formik.errors.account_holder
                    : undefined
                }
              />
            </div>

            {/* Account Type + Country — 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payout-type" className="text-sm font-medium">
                  Account Type
                </Label>
                <Input
                  id="payout-type"
                  name="account_type"
                  placeholder="e.g. Savings"
                  className="mt-1"
                  value={formik.values.account_type}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <FieldError
                  msg={
                    formik.touched.account_type
                      ? formik.errors.account_type
                      : undefined
                  }
                />
              </div>
              <div>
                <Label htmlFor="payout-country" className="text-sm font-medium">
                  Country Code
                </Label>
                <Input
                  id="payout-country"
                  name="country_code"
                  placeholder="e.g. NG"
                  maxLength={2}
                  className="mt-1 uppercase"
                  value={formik.values.country_code}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                <FieldError
                  msg={
                    formik.touched.country_code
                      ? formik.errors.country_code
                      : undefined
                  }
                />
              </div>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="payout-confirm"
                name="confirmed"
                type="checkbox"
                checked={formik.values.confirmed}
                onChange={formik.handleChange}
                className="mt-1 h-4 w-4 rounded border-gray-300 accent-black"
              />
              <label
                htmlFor="payout-confirm"
                className="text-sm text-gray-600 leading-snug cursor-pointer"
              >
                I confirm that the bank details above are correct and I
                authorise this payout request.
              </label>
            </div>
            {formik.touched.confirmed && formik.errors.confirmed && (
              <FieldError msg={formik.errors.confirmed} />
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className="w-full flex items-center justify-center gap-2 h-11 bg-black text-white rounded-lg font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formik.isSubmitting ? (
                <LucideLoader2 size={18} className="animate-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
              {formik.isSubmitting ? 'Submitting…' : 'Submit Payout Request'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RequestPayoutModal
