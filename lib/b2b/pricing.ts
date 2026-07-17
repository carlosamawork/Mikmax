import {cache} from 'react'
import {getShopB2bPricing} from '@/lib/shopify-admin'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {parseDiscountSpec, displayPercent, type DiscountSpec} from '@/lib/b2b/discountSpec'

// Precio descontado redondeado a 2 decimales. percent 0 → sin cambios.
export function discountedPrice(amount: number, percent: number): number {
  const pct = Math.max(0, Math.min(percent, 100))
  if (!pct) return amount
  return Math.round(amount * (1 - pct / 100) * 100) / 100
}

type CardLike = {minPrice?: number; maxPrice?: number; compareAtPrice?: number}

// Aplica el % de display a una card: min/max descontados, compareAt = min original (tachado).
export function applyDiscountToCard<T extends CardLike>(card: T, percent: number): T & CardLike {
  if (!percent || typeof card.minPrice !== 'number') return card
  return {
    ...card,
    compareAtPrice: card.minPrice,
    minPrice: discountedPrice(card.minPrice, percent),
    maxPrice:
      typeof card.maxPrice === 'number' ? discountedPrice(card.maxPrice, percent) : card.maxPrice,
  }
}

// Spec efectivo del cliente de ESTA request: override (b2b.discount) > default de
// tienda (b2b.pricing) > null. Solo clientes B2B validados.
export const getEffectiveDiscountSpec = cache(async (): Promise<DiscountSpec | null> => {
  const session = await getCurrentCustomer()
  const c = session?.customer
  if (c?.b2bValidated?.value !== 'true') return null
  const override = parseDiscountSpec(c?.b2bDiscount?.value)
  if (override) return override
  return parseDiscountSpec(await getShopB2bPricing())
})

// % a pintar en PDP/listados en ESTA request (0 si el spec es de tramos o no hay).
export const getDisplayPercent = cache(async (): Promise<number> => {
  return displayPercent(await getEffectiveDiscountSpec())
})
