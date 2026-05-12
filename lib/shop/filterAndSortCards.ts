// lib/shop/filterAndSortCards.ts
import type {ProductCardData, ShopSearchParams, SortKey} from '@/types/shop'

/**
 * Applies card-level filters after expansion. Currently:
 *  - price (min/max) against the card's representative variant price.
 *  - availability flag — when params.available === 'true', drops cards
 *    whose representative variant is not for sale.
 */
export function applyCardFilters(
  cards: ProductCardData[],
  params: ShopSearchParams,
): ProductCardData[] {
  const min = params.priceMin ? Number(params.priceMin) : undefined
  const max = params.priceMax ? Number(params.priceMax) : undefined
  const onlyAvailable = params.available === 'true'
  if (
    min === undefined &&
    max === undefined &&
    !onlyAvailable
  ) {
    return cards
  }
  return cards.filter((c) => {
    if (onlyAvailable && c.availableForSale === false) return false
    if (min !== undefined || max !== undefined) {
      const price = c.minPrice ?? Number.POSITIVE_INFINITY
      if (min !== undefined && price < min) return false
      if (max !== undefined && price > max) return false
    }
    return true
  })
}

/**
 * Sorts cards. Only price-asc / price-desc reorder cards relative to each other;
 * the other sorts are honored at product level by Shopify or Sanity orderRank
 * earlier in the pipeline (cards inside a product stay grouped).
 */
export function sortCards(cards: ProductCardData[], sort: SortKey): ProductCardData[] {
  if (sort === 'price-asc') {
    return [...cards].sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0))
  }
  if (sort === 'price-desc') {
    return [...cards].sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0))
  }
  return cards
}
