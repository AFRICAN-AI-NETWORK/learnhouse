import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  exchangeRates: Record<string, number>;
  convertAmount: (amountUSD: number) => number;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  exchangeRates: { USD: 1 },
  convertAmount: (amount) => amount,
  isLoading: true,
});

export const useCurrency = () => useContext(CurrencyContext);

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  NG: "NGN",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  UG: "UGX",
  RW: "RWF",
  TZ: "TZS",
  ZM: "ZMW",
};

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currency, setCurrencyState] = useState("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  const setCurrency = async (newCurrency: string) => {
    setCurrencyState(newCurrency);
    await AsyncStorage.setItem("learnhouse_preferred_currency", newCurrency);
  };

  useEffect(() => {
    const initializeCurrencyAndRates = async () => {
      try {
        let rates = { USD: 1 };
        const savedRatesStr = await AsyncStorage.getItem(
          "learnhouse_exchange_rates",
        );
        const savedRatesTime = await AsyncStorage.getItem(
          "learnhouse_exchange_rates_time",
        );

        // Cache rates for 12 hours (43200000 ms)
        const CACHE_DURATION = 12 * 60 * 60 * 1000;
        const now = Date.now();

        let shouldFetchRates = true;
        if (savedRatesStr && savedRatesTime) {
          if (now - parseInt(savedRatesTime) < CACHE_DURATION) {
            rates = JSON.parse(savedRatesStr);
            shouldFetchRates = false;
          }
        }

        if (shouldFetchRates) {
          try {
            const res = await fetch("https://open.er-api.com/v6/latest/USD");
            const data = await res.json();
            if (data && data.rates) {
              rates = data.rates;
              await AsyncStorage.setItem(
                "learnhouse_exchange_rates",
                JSON.stringify(rates),
              );
              await AsyncStorage.setItem(
                "learnhouse_exchange_rates_time",
                now.toString(),
              );
            }
          } catch (error) {
            console.error(
              "Failed to fetch live rates, falling back to cached or default.",
              error,
            );
            if (savedRatesStr) rates = JSON.parse(savedRatesStr);
          }
        }

        setExchangeRates(rates);

        // Initialize User Currency
        const savedCurrency = await AsyncStorage.getItem(
          "learnhouse_preferred_currency",
        );
        if (savedCurrency) {
          setCurrencyState(savedCurrency);
        } else {
          try {
            const geoRes = await fetch("https://ipapi.co/json/");
            const geoData = await geoRes.json();
            const country = geoData.country;
            if (country && COUNTRY_CURRENCY_MAP[country]) {
              const autoCurrency = COUNTRY_CURRENCY_MAP[country];
              setCurrencyState(autoCurrency);
              await AsyncStorage.setItem(
                "learnhouse_preferred_currency",
                autoCurrency,
              );
            }
          } catch (error) {
            console.error(
              "Failed to auto-detect location for currency.",
              error,
            );
          }
        }
      } catch (error) {
        console.error("Currency initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCurrencyAndRates();
  }, []);

  const convertAmount = (amountUSD: number) => {
    if (currency === "USD") return amountUSD;
    const rate = exchangeRates[currency];
    if (rate) {
      return amountUSD * rate;
    }
    return amountUSD;
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, exchangeRates, convertAmount, isLoading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};
