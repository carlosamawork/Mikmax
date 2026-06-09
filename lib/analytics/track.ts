import type {AnalyticsItem} from './types'
import {itemsValue, toGa4Item, toMetaContents, getStoreCurrency} from './item'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

let counter = 0
function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  counter += 1
  return `${Date.now()}-${counter}`
}

function ga4(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', name, params)
}

function meta(name: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', name, params, {eventID: eventId})
}

export function trackPageView(path: string, location: string) {
  ga4('page_view', {page_path: path, page_location: location})
  meta('PageView', {}, newEventId())
}

export function trackViewItem(item: AnalyticsItem) {
  ga4('view_item', {currency: item.currency, value: item.price, items: [toGa4Item(item)]})
  meta(
    'ViewContent',
    {
      content_type: 'product',
      content_ids: [item.id],
      content_name: item.name,
      value: item.price,
      currency: item.currency,
    },
    newEventId(),
  )
}

export function trackAddToCart(items: AnalyticsItem[]) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  const value = itemsValue(items)
  ga4('add_to_cart', {currency, value, items: items.map(toGa4Item)})
  meta(
    'AddToCart',
    {
      content_type: 'product',
      content_ids: items.map((it) => it.id),
      contents: toMetaContents(items),
      value,
      currency,
    },
    newEventId(),
  )
}

export function trackBeginCheckout(items: AnalyticsItem[]) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  const value = itemsValue(items)
  ga4('begin_checkout', {currency, value, items: items.map(toGa4Item)})
  meta(
    'InitiateCheckout',
    {
      content_type: 'product',
      content_ids: items.map((it) => it.id),
      contents: toMetaContents(items),
      value,
      currency,
      num_items: items.reduce((n, it) => n + it.quantity, 0),
    },
    newEventId(),
  )
}
