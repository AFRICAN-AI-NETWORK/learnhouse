'use client'

import React from 'react'
import { useCurrency } from '@components/Contexts/CurrencyContext'

interface PriceDisplayProps {
  basePriceUSD: number
  originalPriceUSD?: number
  interval?: string // e.g. "/mo", "/year", or ""
  className?: string
  priceClassName?: string
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  NGN: '₦',
  GHS: 'GH₵',
  KES: 'KSh',
  ZAR: 'R',
  UGX: 'USh',
  RWF: 'FRw',
  TZS: 'TSh',
  ZMW: 'ZK',
}

export default function PriceDisplay({
  basePriceUSD,
  originalPriceUSD,
  interval = '',
  className = '',
  priceClassName = 'text-[56px]',
  hideSwitcher = false,
}: PriceDisplayProps & { hideSwitcher?: boolean }) {
  const { currency, setCurrency, convertAmount, isLoading } = useCurrency()

  if (isLoading) {
    return <div className="animate-pulse w-32 h-10 bg-white/10 rounded-xl" />
  }

  const finalAmount = convertAmount(basePriceUSD)
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '

  // Format amount (no decimals for large numbers like NGN, 2 decimals for USD/small currencies)
  const formattedAmount =
    finalAmount > 1000
      ? Math.round(finalAmount).toLocaleString()
      : Number.isInteger(finalAmount)
        ? finalAmount.toString()
        : finalAmount.toFixed(2)

  const finalOriginalAmount = originalPriceUSD ? convertAmount(originalPriceUSD) : null
  const formattedOriginalAmount = finalOriginalAmount !== null
    ? (finalOriginalAmount > 1000
        ? Math.round(finalOriginalAmount).toLocaleString()
        : Number.isInteger(finalOriginalAmount)
          ? finalOriginalAmount.toString()
          : finalOriginalAmount.toFixed(2))
    : null

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {formattedOriginalAmount && (
        <div className="text-gray-500 font-bold line-through text-2xl -mb-3">
          {symbol}
          {formattedOriginalAmount}
          {interval && <span className="text-lg"> {interval}</span>}
        </div>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className={`${priceClassName} font-bold text-white tracking-tight`}
        >
          {symbol}
          {formattedAmount}
        </span>
        {interval && (
          <span className="text-xl font-bold text-gray-400">{interval}</span>
        )}
      </div>

      {/* Currency Switcher */}
      {!hideSwitcher && (
        <div className="relative inline-block w-max mt-2 rounded-lg overflow-hidden p-[1.5px]">
          {/* Animated border gradient */}
          <div className="absolute inset-[-100%] animate-spin bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#10b981_50%,transparent_100%)] opacity-70" />

          <div className="relative bg-[#0a0f1e] rounded-[6px]">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="appearance-none bg-transparent text-sm font-bold text-gray-200 py-2 pl-4 pr-10 rounded-[6px] outline-none focus:ring-2 focus:ring-emerald-500/50 hover:bg-white/5 transition-colors cursor-pointer w-full"
            >
              <option value="USD" className="bg-[#0a0f1e]">
                USD - US Dollar
              </option>
              <option value="NGN" className="bg-[#0a0f1e]">
                NGN - Nigerian Naira
              </option>
              <option value="GHS" className="bg-[#0a0f1e]">
                GHS - Ghanaian Cedi
              </option>
              <option value="KES" className="bg-[#0a0f1e]">
                KES - Kenyan Shilling
              </option>
              <option value="ZAR" className="bg-[#0a0f1e]">
                ZAR - South African Rand
              </option>
              <option value="UGX" className="bg-[#0a0f1e]">
                UGX - Ugandan Shilling
              </option>
              <option value="RWF" className="bg-[#0a0f1e]">
                RWF - Rwandan Franc
              </option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-400">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
