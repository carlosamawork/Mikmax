'use server'

import {getCurrentCustomer} from '@/lib/auth/customer'
import {cartBuyerIdentityUpdate, cartDeliveryAddressesReplace} from '@/lib/shopify'

// Antes de redirigir al checkout hosted de Shopify: si hay sesión, (1) asocia el carrito al
// cliente (customerAccessToken) → checkout LOGUEADO, y (2) selecciona su dirección por defecto
// como dirección de entrega → rellena el FORMULARIO PRINCIPAL (nombre + dirección).
// Si no hay sesión o falla, devuelve la checkoutUrl original sin tocar nada.
export async function prepareCheckout(
  cartId: string,
  fallbackUrl: string,
): Promise<{checkoutUrl: string}> {
  const session = await getCurrentCustomer()
  if (!session || !cartId) return {checkoutUrl: fallbackUrl}

  // 1. Asociar el cliente (necesario para que el checkout salga logueado y para poder copiar
  //    su dirección guardada en el paso 2).
  let cart = await cartBuyerIdentityUpdate(cartId, {customerAccessToken: session.token})

  // 2. Seleccionar su dirección por defecto en el formulario principal.
  const addrId = session.customer.defaultAddress?.id
  if (addrId) {
    const withAddr = await cartDeliveryAddressesReplace(cartId, [
      {address: {copyFromCustomerAddressId: addrId}, selected: true},
    ])
    if (withAddr && !withAddr.error && withAddr.checkoutUrl) cart = withAddr
  }

  const url = cart && !cart.error && cart.checkoutUrl ? cart.checkoutUrl : fallbackUrl
  return {checkoutUrl: url}
}
