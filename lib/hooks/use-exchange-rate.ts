"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { ExchangeRate } from "@/lib/types"

const fetcher = async () => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() // Use maybeSingle to get null instead of error if empty

  if (error && error.code !== "PGRST116") {
    // Solo lanzamos error si no es un error de "no se encontró fila"
    throw error
  }
  
  return data as ExchangeRate | null
}

export function useExchangeRate() {
  const { data: exchangeData, error: exchangeError, isLoading: exchangeLoading, mutate: mutateRate } = useSWR("exchange-rate", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  // Fetch business profile for base currency setting
  const { data: businessData, mutate: mutateBusiness } = useSWR("business-profile", async () => {
    const supabase = createClient()
    const { data } = await supabase.from("business_profile").select("*").single()
    return data
  })

  const rate = exchangeData?.rate || 58.50
  const baseCurrency = businessData?.base_currency || "DOP"

  const usdToDop = (usd: number) => usd * rate
  const dopToUsd = (dop: number) => dop / rate

  const formatUsd = (amount: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

  const formatDop = (amount: number) => 
    `RD$ ${new Intl.NumberFormat("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`

  // Helpers for the main (base) currency and secondary conversion
  const formatMain = (amount: number) => 
    baseCurrency === "DOP" ? formatDop(amount) : formatUsd(amount)

  const formatSecondary = (amount: number) => {
    if (baseCurrency === "DOP") {
      return formatUsd(dopToUsd(amount))
    } else {
      return formatDop(usdToDop(amount))
    }
  }

  const currencySymbol = baseCurrency === "DOP" ? "RD$" : "$"

  return {
    rate,
    currentRate: rate,
    exchangeRate: exchangeData,
    baseCurrency,
    currencySymbol,
    isLoading: exchangeLoading,
    error: exchangeError,
    refreshRate: mutateRate,
    refreshBusiness: mutateBusiness,
    usdToDop,
    dopToUsd,
    formatUsd,
    formatDop,
    formatMain,
    formatSecondary,
  }
}
