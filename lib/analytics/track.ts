import type {AnalyticsItem} from './types'
import {itemsValue, toGa4Item, getStoreCurrency} from './item'

// Capa única de tracking del storefront: solo dataLayer.push en formato
// ecommerce estándar de GA4. GTM (gestionado por la agencia) enruta estos
// eventos a GA4, Meta y el resto de plataformas; aquí no se llama a ningún
// SDK de terceros directamente.
function push(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
}

// GTM mergea los pushes de forma acumulativa: sin este reset, los items de un
// evento anterior contaminan el siguiente.
function pushEcommerce(event: string, ecommerce: Record<string, unknown>) {
  push({ecommerce: null})
  push({event, ecommerce})
}

export function trackViewItemList(items: AnalyticsItem[], listName: string) {
  if (!items.length) return
  pushEcommerce('view_item_list', {
    item_list_name: listName,
    items: items.map((it, i) => ({...toGa4Item(it), index: i})),
  })
}

export function trackViewItem(item: AnalyticsItem) {
  pushEcommerce('view_item', {
    currency: item.currency,
    value: item.price,
    items: [toGa4Item(item)],
  })
}

export function trackAddToCart(items: AnalyticsItem[]) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  pushEcommerce('add_to_cart', {
    currency,
    value: itemsValue(items),
    items: items.map(toGa4Item),
  })
}

export function trackViewCart(items: AnalyticsItem[], total?: number) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  pushEcommerce('view_cart', {
    currency,
    value: total ?? itemsValue(items),
    items: items.map(toGa4Item),
  })
}

// begin_checkout NO se emite desde el storefront: lo empuja el custom pixel
// del checkout de Shopify (gestionado por la agencia) al entrar en el checkout.
// Emitirlo también aquí duplicaría el evento en GA4.

export function trackWhatsAppClick(location: string) {
  push({event: 'whatsapp_click', click_location: location})
}
