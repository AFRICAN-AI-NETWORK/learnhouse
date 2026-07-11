'use client'

import React from 'react'
import { useCurrency } from '@components/Contexts/CurrencyContext'

interface PriceDisplayProps {
  basePriceUSD: number
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

export default function PriceDisplay({ basePriceUSD, interval = '', className = '', priceClassName = 'text-[56px]', hideSwitcher = false }: PriceDisplayProps & { hideSwitcher?: boolean }) {
  const { currency, setCurrency, convertAmount, isLoading } = useCurrency()

  if (isLoading) {
    return <div className="animate-pulse w-32 h-10 bg-white/10 rounded-xl" />
  }

  const finalAmount = convertAmount(basePriceUSD)
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '

  // Format amount (no decimals for large numbers like NGN, 2 decimals for USD/small currencies)
  const formattedAmount = finalAmount > 1000 
    ? Math.round(finalAmount).toLocaleString()
    : Number.isInteger(finalAmount) ? finalAmount.toString() : finalAmount.toFixed(2)

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline gap-1">
        <span className={`${priceClassName} font-bold text-white tracking-tight`}>
          {symbol}{formattedAmount}
        </span>
        {interval && <span className="text-xl font-bold text-gray-400">{interval}</span>}
      </div>
      
      {/* Currency Switcher */}
      {!hideSwitcher && (
        <div className="relative inline-block w-max mt-1">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 text-xs font-bold text-gray-300 py-1 pl-2 pr-7 rounded-md outline-none focus:ring-2 focus:ring-emerald-500/50 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <option value="USD" className="bg-[#0a0f1e]">USD</option>
            <option value="NGN" className="bg-[#0a0f1e]">NGN</option>
            <option value="GHS" className="bg-[#0a0f1e]">GHS</option>
            <option value="KES" className="bg-[#0a0f1e]">KES</option>
            <option value="ZAR" className="bg-[#0a0f1e]">ZAR</option>
            <option value="UGX" className="bg-[#0a0f1e]">UGX</option>
            <option value="RWF" className="bg-[#0a0f1e]">RWF</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
