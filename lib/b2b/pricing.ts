import {cache} from 'react'
import {getShopB2bPricing} from '@/lib/shopify-admin'
import {getCurrentCustomer} from '@/lib/auth/customer'

export interface DesignerTier {
  minSubtotal: number
  percent: number
}

export interface PricingConfig {
  resellerPercent: number
  designerTiers: DesignerTier[]
}

// Misma forma/validación que la Function (Plan A). Único punto de verdad de la config.
export function parsePricingConfig(json: string | null | undefined): PricingConfig | null {
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.resellerPercent !== 'number') return null
  if (!Array.isArray(o.designerTiers)) return null
  const tiers: DesignerTier[] = []
  for (const t of o.designerTiers) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent})
  }
  return {resellerPercent: o.resellerPercent, designerTiers: tiers}
}

// Precio reseller redondeado a 2 decimales. percent 0 → sin cambios.
export function resellerPrice(amount: number, percent: number): number {
  const pct = Math.max(0, Math.min(percent, 100))
  if (!pct) return amount
  return Math.round(amount * (1 - pct / 100) * 100) / 100
}

type CardLike = {minPrice?: number; maxPrice?: number; compareAtPrice?: number}

// Aplica el % reseller a una card: min/max descontados, compareAt = min original (tachado).
export function applyResellerToCard<T extends CardLike>(card: T, percent: number): T & CardLike {
  if (!percent || typeof card.minPrice !== 'number') return card
  return {
    ...card,
    compareAtPrice: card.minPrice,
    minPrice: resellerPrice(card.minPrice, percent),
    maxPrice:
      typeof card.maxPrice === 'number' ? resellerPrice(card.maxPrice, percent) : card.maxPrice,
  }
}

// % reseller a aplicar en ESTA request (0 si no es reseller validado o no hay config).
export const getB2bPricingConfig = cache(async (): Promise<PricingConfig | null> => {
  const value = await getShopB2bPricing()
  return parsePricingConfig(value)
})

export const getResellerPercent = cache(async (): Promise<number> => {
  const session = await getCurrentCustomer()
  const c = session?.customer
  if (c?.b2bValidated?.value !== 'true') return 0
  if (c?.b2bClientType?.value !== 'reseller') return 0
  const cfg = await getB2bPricingConfig()
  return cfg ? cfg.resellerPercent : 0
})
