'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface CurrencyContextType {
  currency: string
  setCurrency: (currency: string) => void
  exchangeRates: Record<string, number>
  convertAmount: (amountUSD: number) => number
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'USD',
  setCurrency: () => {},
  exchangeRates: { USD: 1 },
  convertAmount: (amount) => amount,
  isLoading: true,
})

export const useCurrency = () => useContext(CurrencyContext)

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
  UG: 'UGX',
  RW: 'RWF',
  TZ: 'TZS',
  ZM: 'ZMW',
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState('USD')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
  })
  const [isLoading, setIsLoading] = useState(true)

  const setCurrency = (newCurrency: string) => {
    setCurrencyState(newCurrency)
    localStorage.setItem('preferred_currency', newCurrency)
  }

  useEffect(() => {
    const initializeCurrencyAndRates = async () => {
      try {
        // 1. Fetch live rates (or use fallback from localStorage)
        let rates = { USD: 1 }
        const savedRatesStr = localStorage.getItem('exchange_rates')
        const savedRatesTime = localStorage.getItem('exchange_rates_time')

        // Cache rates for 12 hours (43200000 ms)
        const CACHE_DURATION = 12 * 60 * 60 * 1000
        const now = Date.now()

        let shouldFetchRates = true
        if (savedRatesStr && savedRatesTime) {
          if (now - parseInt(savedRatesTime) < CACHE_DURATION) {
            rates = JSON.parse(savedRatesStr)
            shouldFetchRates = false
          }
        }

        if (shouldFetchRates) {
          try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD')
            const data = await res.json()
            if (data && data.rates) {
              rates = data.rates
              localStorage.setItem('exchange_rates', JSON.stringify(rates))
              localStorage.setItem('exchange_rates_time', now.toString())
            }
          } catch (error) {
            console.error(
              'Failed to fetch live rates, falling back to cached or default.',
              error
            )
            if (savedRatesStr) rates = JSON.parse(savedRatesStr)
          }
        }

        setExchangeRates(rates)

        // 2. Initialize User Currency
        const savedCurrency = localStorage.getItem('preferred_currency')
        if (savedCurrency) {
          setCurrencyState(savedCurrency)
        } else {
          try {
            const geoRes = await fetch('https://ipapi.co/json/')
            const geoData = await geoRes.json()
            const country = geoData.country
            if (country && COUNTRY_CURRENCY_MAP[country]) {
              const autoCurrency = COUNTRY_CURRENCY_MAP[country]
              setCurrencyState(autoCurrency)
              localStorage.setItem('preferred_currency', autoCurrency)
            }
          } catch (error) {
            console.error(
              'Failed to detect geolocation, defaulting to USD',
              error
            )
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeCurrencyAndRates()
  }, [])

  const convertAmount = (amountUSD: number) => {
    const rate = exchangeRates[currency] || 1
    return amountUSD * rate
  }

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, exchangeRates, convertAmount, isLoading }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}
