import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrg } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import useSWR from 'swr'
import {
  getProductsByCourse,
  getStripeProductCheckoutSession,
} from '@services/payments/products'
import { RefreshCcw, SquareCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@components/ui/badge'
import { Button } from '@components/ui/button'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { getUriWithOrg } from '@services/config/config'
import { validateDiscountCode } from '@services/payments/discounts'
import { X, Tag } from 'lucide-react'
import { Input } from '@components/ui/input'

interface CoursePaidOptionsProps {
  course: {
    id: string
    org_id: number
  }
}

function CoursePaidOptions({ course }: CoursePaidOptionsProps) {
  const { t, i18n } = useTranslation()
  const org = useOrg() as any
  const session = useLHSession() as any
  const [expandedProducts, setExpandedProducts] = useState<{
    [key: string]: boolean
  }>({})
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>(
    {}
  )
  const router = useRouter()

  const { data: linkedProducts, error } = useSWR(
    () =>
      org && session
        ? [
            `/payments/${course.org_id}/courses/${course.id}/products`,
            session.data?.tokens?.access_token,
          ]
        : null,
    ([, token]) => getProductsByCourse(course.org_id, course.id, token)
  )

  const [discountCode, setDiscountCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [discountError, setDiscountError] = useState<string | null>(null)

  const handleApplyDiscount = async (amount: number) => {
    if (!discountCode.trim()) return

    setIsValidating(true)
    setDiscountError(null)

    try {
      const response = (await validateDiscountCode(
        course.org_id,
        discountCode,
        parseInt(course.id),
        amount,
        session.data?.tokens?.access_token
      )) as any

      if (response.valid) {
        setAppliedDiscount(response)
        toast.success(t('payments.discount_applied'))
      } else {
        setDiscountError(response.error || t('payments.invalid_discount_code'))
        setAppliedDiscount(null)
      }
    } catch {
      setDiscountError(t('common.error_request'))
      setAppliedDiscount(null)
    } finally {
      setIsValidating(false)
    }
  }

  const clearDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError(null)
  }

  const handleCheckout = async (productId: number) => {
    if (!session.data?.user) {
      // Redirect to login if user is not authenticated
      router.push(`/signup?orgslug=${org.slug}`)
      return
    }

    try {
      setIsProcessing((prev) => ({ ...prev, [productId]: true }))
      const redirect_uri = getUriWithOrg(org.slug, '/courses')
      const response = await getStripeProductCheckoutSession(
        course.org_id,
        productId,
        redirect_uri,
        session.data?.tokens?.access_token,
        appliedDiscount?.code
      )

      if (response.success) {
        router.push(response.data.checkout_url)
      } else {
        toast.error(t('payments.failed_checkout'))
      }
    } catch {
      toast.error(t('common.error_request'))
    } finally {
      setIsProcessing((prev) => ({ ...prev, [productId]: false }))
    }
  }

  const toggleProductExpansion = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  if (error) return <div>{t('payments.failed_load_products')}</div>
  if (!linkedProducts) return <div>{t('common.loading')}</div>

  return (
    <div className="space-y-4 p-1">
      {linkedProducts.data.map((product: any) => (
        <div
          key={product.id}
          className="bg-slate-50/30 p-4 rounded-lg nice-shadow flex flex-col"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col space-y-1 items-start">
              <Badge
                className="w-fit flex items-center space-x-2 bg-gray-100/50"
                variant="outline"
              >
                {product.product_type === 'subscription' ? (
                  <RefreshCcw size={12} />
                ) : (
                  <SquareCheck size={12} />
                )}
                <span className="text-sm">
                  {product.product_type === 'subscription'
                    ? t('payments.subscription')
                    : t('payments.one_time_payment')}
                  {product.product_type === 'subscription' &&
                    ` ${t('payments.per_month')}`}
                </span>
              </Badge>
              <h3 className="font-bold text-lg">{product.name}</h3>
            </div>
          </div>

          <div className="grow overflow-hidden">
            <div
              className={`transition-all duration-300 ease-in-out ${
                expandedProducts[product.id] ? 'max-h-[1000px]' : 'max-h-24'
              } overflow-hidden`}
            >
              <p className="text-gray-600">{product.description}</p>
              {product.benefits && (
                <div className="mt-2">
                  <h4 className="font-semibold text-sm">
                    {t('payments.benefits')}
                  </h4>
                  <p className="text-sm text-gray-600">{product.benefits}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2">
            <button
              onClick={() => toggleProductExpansion(product.id)}
              className="text-slate-500 hover:text-slate-700 text-sm flex items-center"
            >
              {expandedProducts[product.id] ? (
                <>
                  <ChevronUp size={16} />
                  <span>{t('common.show_less')}</span>
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  <span>{t('common.show_more')}</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
            {product.amount > 0 && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="relative grow">
                    <Tag
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      placeholder={
                        t('payments.discount_code_placeholder') ||
                        'Discount code'
                      }
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      className="pl-9 h-9 text-sm"
                      disabled={isValidating || !!appliedDiscount}
                    />
                    {appliedDiscount && (
                      <button
                        onClick={clearDiscount}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {!appliedDiscount && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyDiscount(product.amount)}
                      disabled={!discountCode || isValidating}
                      className="h-9"
                    >
                      {isValidating ? t('common.loading') : t('common.apply')}
                    </Button>
                  )}
                </div>

                {discountError && (
                  <p className="text-xs text-red-500 font-medium">
                    {discountError}
                  </p>
                )}
              </>
            )}

            <div className="mt-2 flex items-center justify-between bg-gray-100/80 rounded-md p-2.5">
              <span className="text-sm text-gray-600 font-medium">
                {product.price_type === 'customer_choice'
                  ? t('payments.min_price')
                  : t('common.price')}
              </span>
              <div className="flex flex-col items-end">
                {appliedDiscount ? (
                  <>
                    <span className="text-xs text-gray-400 line-through">
                      {new Intl.NumberFormat(
                        i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                        {
                          style: 'currency',
                          currency: product.currency,
                        }
                      ).format(product.amount)}
                    </span>
                    <span className="font-bold text-xl text-teal-600">
                      {new Intl.NumberFormat(
                        i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                        {
                          style: 'currency',
                          currency: product.currency,
                        }
                      ).format(appliedDiscount.final_amount)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-lg">
                    {new Intl.NumberFormat(
                      i18n.language === 'fr' ? 'fr-FR' : 'en-US',
                      {
                        style: 'currency',
                        currency: product.currency,
                      }
                    ).format(product.amount)}
                    {product.product_type === 'subscription' && (
                      <span className="text-sm text-gray-500 ml-1">
                        {t('payments.per_month_short')}
                      </span>
                    )}
                  </span>
                )}
                {product.price_type === 'customer_choice' &&
                  !appliedDiscount && (
                    <span className="text-sm text-gray-500">
                      {t('payments.choose_price')}
                    </span>
                  )}
              </div>
            </div>
          </div>

          <Button
            className="mt-4 w-full"
            variant="default"
            onClick={() => handleCheckout(product.id)}
            disabled={isProcessing[product.id]}
          >
            {isProcessing[product.id]
              ? t('common.processing')
              : product.product_type === 'subscription'
                ? t('payments.subscribe_now')
                : t('payments.purchase_now')}
          </Button>
        </div>
      ))}
    </div>
  )
}

export default CoursePaidOptions
