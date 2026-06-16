'use server'

import {getCustomerToken} from '@/lib/auth/session'
import {cartBuyerIdentityUpdate} from '@/lib/shopify'

// Antes de redirigir al checkout hosted de Shopify: si hay sesión, asocia el carrito al
// cliente (customerAccessToken) para que el checkout salga LOGUEADO y con la dirección
// precargada. Si no hay sesión o falla, devuelve la checkoutUrl original sin tocar nada.
export async function prepareCheckout(
  cartId: string,
  fallbackUrl: string,
): Promise<{checkoutUrl: string}> {
  const token = await getCustomerToken()
  if (!token || !cartId) return {checkoutUrl: fallbackUrl}

  const cart = await cartBuyerIdentityUpdate(cartId, {customerAccessToken: token})
  const url = cart && !cart.error && cart.checkoutUrl ? cart.checkoutUrl : fallbackUrl
  return {checkoutUrl: url}
}
