import type {AnalyticsItem} from './types'

export function getStoreCurrency(): string {
  return process.env.NEXT_PUBLIC_CURRENCY || 'EUR'
}

export function itemsValue(items: AnalyticsItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0)
}

export function toGa4Item(it: AnalyticsItem) {
  return {
    item_id: it.id,
    item_name: it.name,
    price: it.price,
    quantity: it.quantity,
    ...(it.variant ? {item_variant: it.variant} : {}),
  }
}

export function toMetaContents(items: AnalyticsItem[]) {
  return items.map((it) => ({id: it.id, quantity: it.quantity}))
}
