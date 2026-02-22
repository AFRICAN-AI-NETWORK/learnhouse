'use client'
import React, { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getPublicProducts } from '@services/payments/public-products'

interface ProductSelectorProps {
  orgId: number
  selected: number[]
  onChange: (ids: number[]) => void
  isLoading?: boolean
}

type PaymentsProduct = {
  id: number
  name: string
  description: string
  amount: number
  currency: string
  benefits?: string
  product_type: 'one_time' | 'subscription'
}

function ProductSelector({
  orgId,
  selected,
  onChange,
  isLoading = false,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<PaymentsProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const data = await getPublicProducts(orgId)
        setProducts(data || [])
        setError('')
      } catch (err: any) {
        setError(err.message || 'Failed to load packages')
      } finally {
        setLoading(false)
      }
    }

    if (orgId) {
      fetchProducts()
    }
  }, [orgId])

  const toggle = (productId: number) => {
    const exists = selected.includes(productId)

    const next = exists
      ? selected.filter((id) => id !== productId)
      : [...selected, productId]

    onChange(next)
  }

  const freeCount = selected.filter(
    (id) => products.find((p) => p.id === id)?.amount === 0
  ).length

  const paidCount = selected.length - freeCount

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-900 border border-rose-200">
        <AlertCircle size={18} className="mt-1 shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Error loading packages</p>
          <p className="opacity-90">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-h-[60vh] overflow-hidden space-y-4">
      <h3 className="text-lg font-bold text-slate-900">
        Select the packages you're interested in
      </h3>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 gap-4">
              {products.map((product) => {
                const isSelected = selected.includes(product.id)

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggle(product.id)}
                    className={`relative text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'border-black bg-white shadow-md ring-2 ring-black/10'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-3 w-full">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="mt-1 w-5 h-5 shrink-0"
                      />

                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                          <span className="font-bold text-sm text-slate-900 wrap-break-word">
                            {product.name}
                          </span>

                          {/* Price Badge */}
                          {product.amount === 0 ? (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0"
                            >
                              🟢 FREE
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-800 hover:bg-amber-100 shrink-0"
                            >
                              💰{' '}
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: product.currency,
                                minimumFractionDigits: 0,
                              }).format(product.amount)}
                              {product.product_type === 'subscription' && '/mo'}
                            </Badge>
                          )}
                        </div>

                        {product.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2 wrap-break-word">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {products.length === 0 && !loading && (
                <div className="col-span-full p-6 rounded-xl border border-slate-100 bg-slate-50 text-center">
                  <p className="text-sm text-slate-600">
                    No packages available at the moment
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {selected.length > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {selected.length}
                </span>{' '}
                package{selected.length !== 1 ? 's' : ''} selected (
                <span className="text-emerald-700 font-medium">
                  {freeCount}
                </span>{' '}
                free,{' '}
                <span className="text-amber-700 font-medium">{paidCount}</span>{' '}
                paid)
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ProductSelector
