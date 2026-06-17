'use server'

import {cartBuyerIdentityUpdate} from '@/lib/shopify'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'

export interface CartCost {
  subtotal: number
  total: number
  discount: number
  discountTitle: string | null
  currency: string
}

function readCost(cart: any): CartCost | null {
  const c = cart?.cost
  if (!c?.subtotalAmount) return null
  const subtotal = Number(c.subtotalAmount.amount)
  const total = Number(c.totalAmount?.amount ?? c.subtotalAmount.amount)
  const alloc = Array.isArray(cart.discountAllocations) ? cart.discountAllocations[0] : null
  return {
    subtotal,
    total,
    discount: Math.max(0, subtotal - total),
    discountTitle: alloc?.title ?? alloc?.code ?? null,
    currency: c.subtotalAmount.currencyCode ?? 'EUR',
  }
}

// Syncs the cart's buyerIdentity with the session:
//   B2B validado  -> setea customerAccessToken (la Function aplica y el carrito refleja el descuento)
//   resto/logout  -> limpia el buyerIdentity
// Devuelve el coste actualizado para pintar subtotal/descuento/total.
export async function syncCartBuyer(cartId: string): Promise<{cost: CartCost | null}> {
  if (!cartId) return {cost: null}
  const session = await getCurrentCustomer()
  const buyerIdentity =
    session && isB2bApproved(session.customer)
      ? {customerAccessToken: session.token}
      : {customerAccessToken: null}
  const cart = await cartBuyerIdentityUpdate(cartId, buyerIdentity)
  return {cost: cart ? readCost(cart) : null}
}
