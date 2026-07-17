'use server'

import {cartBuyerIdentityUpdate, getCart} from '@/lib/shopify'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'
import {parseCartCost} from '@/lib/b2b/cartCost'
import {getEffectiveDiscountSpec} from '@/lib/b2b/pricing'
import type {CartCost} from '@/types/cart'

// Descarta el objeto de error {error} que devuelven los helpers de carrito en fallo.
function okCart(cart: unknown): unknown | null {
  return cart && !(cart as {error?: unknown}).error ? cart : null
}

// Solo lectura: coste actual del carrito (para hidratar en mount sin mutar nada).
export async function getCartCost(cartId: string): Promise<{cost: CartCost | null}> {
  if (!cartId) return {cost: null}
  const cart = okCart(await getCart(cartId))
  return {cost: cart ? parseCartCost(cart) : null}
}

export interface B2bCartContext {
  hasTiers: boolean
  tiers: {minSubtotal: number; percent: number}[]
}

// Si el spec efectivo del cliente es por tramos, los devuelve (para el nudge del carrito).
export async function getB2bCartContext(): Promise<B2bCartContext> {
  const spec = await getEffectiveDiscountSpec()
  if (spec?.type !== 'tiers' || spec.tiers.length === 0) return {hasTiers: false, tiers: []}
  return {hasTiers: true, tiers: spec.tiers}
}

// Muta el buyerIdentity del carrito según la sesión (SOLO en login/logout):
//   B2B validado -> setea customerAccessToken (la Function aplica el descuento)
//   resto/logout -> limpia el buyerIdentity
export async function syncCartBuyer(cartId: string): Promise<{cost: CartCost | null}> {
  if (!cartId) return {cost: null}
  const session = await getCurrentCustomer()
  const buyerIdentity =
    session && isB2bApproved(session.customer)
      ? {customerAccessToken: session.token}
      : {customerAccessToken: null}
  const cart = okCart(await cartBuyerIdentityUpdate(cartId, buyerIdentity))
  return {cost: cart ? parseCartCost(cart) : null}
}
