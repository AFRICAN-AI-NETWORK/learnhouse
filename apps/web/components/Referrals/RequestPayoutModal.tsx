'use client'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
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
  org_id: string
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
  org_id,
}: RequestPayoutModalProps) {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)

  const maxAmount = balance?.eligible_balance ?? 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayoutFormValues>({
    defaultValues: {
      amount: '',
      bank_name: '',
      account_number: '',
      account_holder: '',
      account_type: '',
      country_code: '',
      confirmed: false,
    },
    resolver: (async (values: any) => {
      const formErrors = validate(values, maxAmount)
      if (Object.keys(formErrors).length > 0) {
        return {
          values: {},
          errors: Object.keys(formErrors).reduce((acc, key) => {
            acc[key as keyof PayoutFormValues] = {
              type: 'manual',
              message: formErrors[key as keyof PayoutFormValues] as string,
            }
            return acc
          }, {} as Record<keyof PayoutFormValues, { type: string; message: string }>),
        }
      }
      return { values, errors: {} }
    }) as any,
  })

  const onSubmit = async (values: any) => {
    setServerError('')
    const payload: PayoutRequestPayload = {
      amount: parseFloat(values.amount),
      bank_name: values.bank_name,
      account_number: values.account_number,
      account_holder: values.account_holder,
      account_type: values.account_type,
      country_code: values.country_code.toUpperCase(),
    }
    const result = await requestPayout(payload, access_token, org_id)
    if (result.success) {
      setSuccess(true)
      reset()
    } else {
      setServerError(
        result.error ?? 'Payout request failed. Please try again.'
      )
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      reset()
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
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
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder={`Max: $${maxAmount.toFixed(2)}`}
                  className="pl-7"
                  {...register('amount')}
                />
              </div>
              <FieldError msg={errors.amount?.message} />
            </div>

            {/* Bank Name */}
            <div>
              <Label htmlFor="payout-bank" className="text-sm font-medium">
                Bank Name
              </Label>
              <Input
                id="payout-bank"
                placeholder="e.g. Standard Bank"
                className="mt-1"
                {...register('bank_name')}
              />
              <FieldError msg={errors.bank_name?.message} />
            </div>

            {/* Account Number */}
            <div>
              <Label htmlFor="payout-acct" className="text-sm font-medium">
                Account Number
              </Label>
              <Input
                id="payout-acct"
                placeholder="e.g. 0001234567"
                className="mt-1"
                {...register('account_number')}
              />
              <FieldError msg={errors.account_number?.message} />
            </div>

            {/* Account Holder */}
            <div>
              <Label htmlFor="payout-holder" className="text-sm font-medium">
                Account Holder Name
              </Label>
              <Input
                id="payout-holder"
                placeholder="Full legal name"
                className="mt-1"
                {...register('account_holder')}
              />
              <FieldError msg={errors.account_holder?.message} />
            </div>

            {/* Account Type + Country — 2 cols */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payout-type" className="text-sm font-medium">
                  Account Type
                </Label>
                <Input
                  id="payout-type"
                  placeholder="e.g. Savings"
                  className="mt-1"
                  {...register('account_type')}
                />
                <FieldError msg={errors.account_type?.message} />
              </div>
              <div>
                <Label htmlFor="payout-country" className="text-sm font-medium">
                  Country Code
                </Label>
                <Input
                  id="payout-country"
                  placeholder="e.g. NG"
                  maxLength={2}
                  className="mt-1 uppercase"
                  {...register('country_code')}
                />
                <FieldError msg={errors.country_code?.message} />
              </div>
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="payout-confirm"
                type="checkbox"
                {...register('confirmed')}
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
            {errors.confirmed && (
              <FieldError msg={errors.confirmed.message} />
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 h-11 bg-black text-white rounded-lg font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LucideLoader2 size={18} className="animate-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
              {isSubmitting ? 'Submitting…' : 'Submit Payout Request'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default RequestPayoutModal
