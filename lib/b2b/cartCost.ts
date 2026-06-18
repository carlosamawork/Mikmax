import type {CartCost} from '@/types/cart'

export interface DesignerTierLite {
  minSubtotal: number
  percent: number
}

// Siguiente tramo de descuento alcanzable, o null si ya está en el máximo.
export function nextTierNudge(
  subtotal: number,
  tiers: DesignerTierLite[],
): {gap: number; percent: number} | null {
  const sorted = [...tiers].sort((a, b) => a.minSubtotal - b.minSubtotal)
  const next = sorted.find((t) => t.minSubtotal > subtotal)
  if (!next) return null
  return {gap: next.minSubtotal - subtotal, percent: next.percent}
}

// Extrae el coste de un carrito de Shopify (con cost + discountAllocations en el fragment).
export function parseCartCost(cart: unknown): CartCost | null {
  const c = cart as
    | {
        cost?: {
          subtotalAmount?: {amount: string; currencyCode?: string}
          totalAmount?: {amount: string}
        }
        discountAllocations?: Array<{title?: string; code?: string}>
      }
    | null
    | undefined
  if (!c?.cost?.subtotalAmount) return null
  const subtotal = Number(c.cost.subtotalAmount.amount)
  const total = Number(c.cost.totalAmount?.amount ?? c.cost.subtotalAmount.amount)
  const alloc = Array.isArray(c.discountAllocations) ? c.discountAllocations[0] : null
  return {
    subtotal,
    total,
    discount: Math.max(0, subtotal - total),
    discountTitle: alloc?.title || alloc?.code || null,
    currency: c.cost.subtotalAmount.currencyCode ?? 'EUR',
  }
}
