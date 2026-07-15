import type {AnalyticsItem} from './types'
import type {ProductCardData} from '@/types/shop'

export function getStoreCurrency(): string {
  return process.env.NEXT_PUBLIC_CURRENCY || 'EUR'
}

export function itemsValue(items: AnalyticsItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0)
}

// ÚNICO punto donde se decide el formato del item_id. Debe casar con el pixel
// de checkout y con los feeds de Merchant Center/Meta o el remarketing dinámico
// no matchea. Formato confirmado por la agencia (jul-2026):
// shopify_ZZ_{productId}_{variantId} — IDs numéricos de Shopify.
const ITEM_ID_PREFIX = 'shopify_ZZ'

export function formatItemId(ids: {productGid?: string; variantGid?: string}): string {
  const numeric = (gid?: string) => gid?.split('/').pop() ?? ''
  return [ITEM_ID_PREFIX, numeric(ids.productGid), numeric(ids.variantGid)]
    .filter(Boolean)
    .join('_')
}

// ProductCardData.id puede ser el id de producto o `${productId}::${variantId}`
// cuando el grid separa por color.
export function cardToAnalyticsItem(p: ProductCardData): AnalyticsItem {
  const [productGid, variantGid] = p.id.includes('::')
    ? p.id.split('::')
    : [p.id, p.variantId]
  return {
    id: formatItemId({productGid, variantGid}),
    name: p.title,
    price: p.minPrice ?? 0,
    quantity: 1,
    variant: p.colorLabel && p.colorLabel !== 'Default' ? p.colorLabel : undefined,
    currency: getStoreCurrency(),
  }
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
