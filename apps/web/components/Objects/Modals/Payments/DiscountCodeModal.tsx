'use client'

import React, { useState } from 'react'
import Modal from '@components/Objects/StyledElements/Modal/Modal'
import { useTranslation } from 'react-i18next'
import { Tag, Loader2, LogIn, ShoppingCart } from 'lucide-react'
import { Input } from '@components/ui/input'
import { Button } from '@components/ui/button'
import { validateDiscountCode } from '@services/payments/discounts'
import toast from 'react-hot-toast'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useRouter } from 'next/navigation'

type Props = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  product: {
    id: number
    name: string
    amount: number
    currency: string
    description?: string
  }
  orgId: number
  orgSlug: string
  onCheckout: (productId: number, discountCode?: string) => void
}

const DiscountCodeModal = ({
  isOpen,
  onOpenChange,
  product,
  orgId,
  orgSlug,
  onCheckout,
}: Props) => {
  const { t, i18n } = useTranslation()
  const session = useLHSession() as any
  const router = useRouter()
  const access_token = session?.data?.tokens?.access_token

  const [code, setCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApply = async () => {
    if (!code.trim()) return
    if (!access_token) {
      toast.error(
        t('auth.authenticate_to_purchase') || 'Please login to apply discount'
      )
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      const result = (await validateDiscountCode(
        orgId,
        code,
        product.amount,
        access_token,
        undefined, // courseId
        product.id // productId
      )) as any

      if (result.valid) {
        setAppliedDiscount(result)
        toast.success(t('payments.discount_applied'))
      } else {
        setError(result.error || t('payments.invalid_discount_code'))
      }
    } catch (err) {
      setError(t('common.error_request'))
    } finally {
      setIsValidating(false)
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: product.currency || 'NGN',
    }).format(amount)
  }

  const finalAmount = appliedDiscount
    ? appliedDiscount.final_amount
    : product.amount

  const content = (
    <div className="space-y-6 pt-4">
      <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
        <div className="max-w-[70%]">
          <h4 className="font-bold text-gray-900 leading-tight">
            {product.name}
          </h4>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {product.description}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-gray-900">
            {formatPrice(product.amount)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
          <Tag size={14} className="text-gray-400" />
          {t('payments.have_discount_code') || 'Have a discount code?'}
        </label>
        <div className="flex gap-2">
          <Input
            placeholder={
              t('payments.discount_code_placeholder') || 'Enter code'
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isValidating || !!appliedDiscount || !access_token}
            className="h-11 uppercase font-mono tracking-widest text-base border-gray-200 focus:border-gray-900 focus:ring-gray-900"
          />
          {!appliedDiscount ? (
            <Button
              variant="outline"
              onClick={handleApply}
              disabled={!code || isValidating || !access_token}
              className="h-11 px-6 border-gray-200 hover:bg-gray-50 font-bold"
            >
              {isValidating ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                t('common.apply')
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="h-11 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold transition-colors"
              onClick={() => {
                setAppliedDiscount(null)
                setCode('')
              }}
            >
              {t('common.remove') || 'Remove'}
            </Button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>

      {appliedDiscount && (
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-2 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">
              {t('common.original_price') || 'Original Price'}
            </span>
            <span className="text-gray-400 line-through">
              {formatPrice(product.amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-emerald-700 font-bold">
            <span className="flex items-center gap-1.5">
              <Tag size={12} />
              {t('payments.discount') || 'Discount'} ({appliedDiscount.code})
            </span>
            <span>-{formatPrice(appliedDiscount.discount_amount)}</span>
          </div>
        </div>
      )}

      <div className="pt-2">
        <div className="flex justify-between items-center mb-6">
          <span className="text-base font-bold text-gray-900 uppercase tracking-wide">
            {t('payments.total_to_pay') || 'Total to pay'}
          </span>
          <span className="text-3xl font-black text-gray-900 tracking-tighter">
            {formatPrice(finalAmount)}
          </span>
        </div>

        {!access_token ? (
          <Button
            className="w-full h-14 text-lg font-black bg-gray-900 hover:bg-black rounded-xl shadow-[0_4px_14px_0_rgb(0,0,0,0.25)] transition-all active:scale-[0.98]"
            onClick={() =>
              router.push(`/login?orgslug=${orgSlug}&redirect=/pricing`)
            }
          >
            <LogIn className="mr-2 w-5 h-5" />
            {t('auth.login_to_purchase') || 'Login to Purchase'}
          </Button>
        ) : (
          <Button
            className="w-full h-14 text-lg font-black bg-gray-900 hover:bg-black rounded-xl shadow-[0_4px_14px_0_rgb(0,0,0,0.25)] transition-all active:scale-[0.98]"
            onClick={() => onCheckout(product.id, appliedDiscount?.code)}
          >
            <ShoppingCart className="mr-2 w-5 h-5" />
            {finalAmount === 0
              ? t('payments.enroll_now') || 'Enroll Now'
              : t('payments.proceed_to_checkout') || 'Proceed to Checkout'}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Modal
      isDialogOpen={isOpen}
      onOpenChange={onOpenChange}
      dialogTitle={t('payments.complete_purchase') || 'Complete Purchase'}
      dialogDescription={
        t('payments.apply_discount_desc') ||
        'Apply a discount code if you have one or proceed to checkout.'
      }
      dialogContent={content}
      minWidth="sm"
    />
  )
}

export default DiscountCodeModal
