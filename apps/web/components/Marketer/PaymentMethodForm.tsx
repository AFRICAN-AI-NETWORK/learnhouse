'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  Smartphone,
  Check,
  AlertCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  Info,
} from 'lucide-react'
import {
  savePaymentMethod,
  deletePaymentMethod,
  getPaymentMethod,
  MarketerPaymentMethod,
  MarketerError,
} from '@services/referral/marketer.service'

const COUNTRY_CONFIG: Record<
  string,
  {
    currency: string
    allowBank: boolean
    allowMobile: boolean
    mobileProviders: string[]
  }
> = {
  NG: { currency: 'NGN', allowBank: true, allowMobile: false, mobileProviders: [] },
  GH: { currency: 'GHS', allowBank: true, allowMobile: true, mobileProviders: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'] },
  KE: { currency: 'KES', allowBank: false, allowMobile: true, mobileProviders: ['M-Pesa', 'Airtel Money'] },
  ZA: { currency: 'ZAR', allowBank: true, allowMobile: false, mobileProviders: [] },
  RW: { currency: 'RWF', allowBank: true, allowMobile: true, mobileProviders: ['MTN MoMo', 'Airtel Money'] },
  TZ: { currency: 'TZS', allowBank: true, allowMobile: true, mobileProviders: ['Vodacom M-Pesa', 'Tigo Pesa', 'Airtel Money'] },
  UG: { currency: 'UGX', allowBank: true, allowMobile: true, mobileProviders: ['MTN MoMo', 'Airtel Money'] },
  CI: { currency: 'XOF', allowBank: true, allowMobile: true, mobileProviders: ['Orange Money', 'MTN MoMo', 'Wave'] },
  EG: { currency: 'EGP', allowBank: true, allowMobile: false, mobileProviders: [] },
}

interface PaymentMethodFormProps {
  orgSlug: string
  onSaved?: () => void
}

export function PaymentMethodForm({ orgSlug, onSaved }: PaymentMethodFormProps) {
  const [savedMethod, setSavedMethod] = useState<MarketerPaymentMethod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [countryCode, setCountryCode] = useState('NG')
  const [methodType, setMethodType] = useState<'BANK_TRANSFER' | 'MOBILE_MONEY'>('BANK_TRANSFER')

  // Form Fields
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    bank_code: '',
  })

  const [mobileDetails, setMobileDetails] = useState({
    phone_number: '',
    provider: 'MTN MoMo',
    account_name: '',
  })

  const config = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG['NG']

  // Auto-switch method type if country doesn't support the current selection
  useEffect(() => {
    if (!config.allowBank && methodType === 'BANK_TRANSFER') {
      setMethodType('MOBILE_MONEY')
    } else if (!config.allowMobile && methodType === 'MOBILE_MONEY') {
      setMethodType('BANK_TRANSFER')
    }
  }, [countryCode, config])

  // Load existing saved method
  useEffect(() => {
    async function fetchMethod() {
      setIsLoading(true)
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
      const res = await getPaymentMethod(token, orgSlug)
      setIsLoading(false)

      if (res.success && res.data) {
        setSavedMethod(res.data)
      }
    }
    fetchMethod()
  }, [orgSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

    const details =
      methodType === 'BANK_TRANSFER'
        ? bankDetails
        : {
            ...mobileDetails,
            provider: mobileDetails.provider || config.mobileProviders[0] || '',
          }

    const payload = {
      payment_method_type: methodType,
      country_code: countryCode,
      account_details: details,
    }

    const res = await savePaymentMethod(token, orgSlug, payload)
    setIsSaving(false)

    if (res.success && res.data) {
      setSavedMethod(res.data)
      setIsEditing(false)
      if (onSaved) onSaved()
    } else if (res.error) {
      if (res.error.error_code === 'MKTR_354') {
        setError('We could not verify these account details — please check and try again.')
      } else {
        setError(res.error.message)
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your saved payment method?')) return
    setIsSaving(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
    const res = await deletePaymentMethod(token, orgSlug)
    setIsSaving(false)

    if (res.success) {
      setSavedMethod(null)
      setIsEditing(true)
      if (onSaved) onSaved()
    }
  }

  if (isLoading) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  }

  // Display Masked Saved Method
  if (savedMethod && !isEditing) {
    const isBank = savedMethod.payment_method_type === 'BANK_TRANSFER'
    const masked = savedMethod.account_details_masked || {}

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              {isBank ? <Building2 size={20} /> : <Smartphone size={20} />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Saved {isBank ? 'Bank Account' : 'Mobile Money'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Payout currency: <strong className="text-gray-800 dark:text-gray-200">{savedMethod.currency}</strong> ({savedMethod.country_code})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Edit Payment Method"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="Delete Payment Method"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg space-y-1.5 text-xs">
          {isBank ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank Name:</span>
                <span className="font-medium text-gray-900 dark:text-white">{masked.bank_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Number:</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">{masked.account_number || '****'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Holder:</span>
                <span className="font-medium text-gray-900 dark:text-white">{masked.account_holder || 'N/A'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider:</span>
                <span className="font-medium text-gray-900 dark:text-white">{masked.provider || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone Number:</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">{masked.phone_number || '****'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Name:</span>
                <span className="font-medium text-gray-900 dark:text-white">{masked.account_name || 'N/A'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // Active Edit / Creation Form
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            {savedMethod ? 'Edit Payment Method' : 'Add Payment Method'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set your bank or mobile money account for automated referral payouts.
          </p>
        </div>

        {savedMethod && (
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white underline"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Country Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Country of Destination
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          >
            <option value="NG">Nigeria (NGN)</option>
            <option value="GH">Ghana (GHS)</option>
            <option value="KE">Kenya (KES)</option>
            <option value="ZA">South Africa (ZAR)</option>
            <option value="RW">Rwanda (RWF)</option>
            <option value="TZ">Tanzania (TZS)</option>
            <option value="UG">Uganda (UGX)</option>
            <option value="CI">Côte d'Ivoire (XOF)</option>
            <option value="EG">Egypt (EGP)</option>
          </select>
        </div>

        {/* Method Type Toggle */}
        <div className="flex gap-3">
          {config.allowBank && (
            <button
              type="button"
              onClick={() => setMethodType('BANK_TRANSFER')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                methodType === 'BANK_TRANSFER'
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <Building2 size={16} />
              Bank Transfer
            </button>
          )}

          {config.allowMobile && (
            <button
              type="button"
              onClick={() => setMethodType('MOBILE_MONEY')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                methodType === 'MOBILE_MONEY'
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <Smartphone size={16} />
              Mobile Money
            </button>
          )}
        </div>

        {/* Bank Transfer Form Fields */}
        {methodType === 'BANK_TRANSFER' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                required
                value={bankDetails.bank_name}
                onChange={(e) => setBankDetails((p) => ({ ...p, bank_name: e.target.value }))}
                placeholder="Access Bank, GTBank, Zenith..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Number
              </label>
              <input
                type="text"
                required
                value={bankDetails.account_number}
                onChange={(e) => setBankDetails((p) => ({ ...p, account_number: e.target.value }))}
                placeholder="0123456789"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                required
                value={bankDetails.account_holder}
                onChange={(e) => setBankDetails((p) => ({ ...p, account_holder: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
              />
            </div>
          </div>
        )}

        {/* Mobile Money Form Fields */}
        {methodType === 'MOBILE_MONEY' && (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobile Money Provider
              </label>
              <select
                value={mobileDetails.provider}
                onChange={(e) => setMobileDetails((p) => ({ ...p, provider: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
              >
                {config.mobileProviders.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registered Mobile Phone Number
              </label>
              <input
                type="tel"
                required
                value={mobileDetails.phone_number}
                onChange={(e) => setMobileDetails((p) => ({ ...p, phone_number: e.target.value }))}
                placeholder="+254 712 345678"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Account Name
              </label>
              <input
                type="text"
                required
                value={mobileDetails.account_name}
                onChange={(e) => setMobileDetails((p) => ({ ...p, account_name: e.target.value }))}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs outline-none"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-2.5 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Verifying & Saving...' : 'Save Payment Method'}
        </button>
      </form>
    </div>
  )
}
