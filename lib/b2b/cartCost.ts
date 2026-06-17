import type {CartCost} from '@/types/cart'

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
