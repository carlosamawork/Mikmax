// app/(frontend)/shop/actions.ts
'use server'

import {
  getCollectionFilters,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters} from '@/lib/shop/searchParams'
import {CHUNK_SIZE} from '@/types/shop'
import type {
  ProductCardData,
  ShopChunkResult,
  ShopSearchParams,
  SortKey,
} from '@/types/shop'

type ShopifyProductNode = {
  id: string
  handle: string
  title: string
  tags?: string[]
  featuredImage?: {url: string; altText?: string | null} | null
  priceRange: {
    minVariantPrice: {amount: string}
    maxVariantPrice: {amount: string}
  }
  compareAtPriceRange: {maxVariantPrice: {amount: string}}
}

function shopifyToCard(p: ShopifyProductNode): ProductCardData {
  const min = Number(p.priceRange.minVariantPrice.amount)
  const max = Number(p.priceRange.maxVariantPrice.amount)
  const compare = Number(p.compareAtPriceRange.maxVariantPrice.amount)
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    imageUrl: p.featuredImage?.url,
    imageAlt: p.featuredImage?.altText ?? undefined,
    minPrice: Number.isFinite(min) ? min : undefined,
    maxPrice: Number.isFinite(max) && max !== min ? max : undefined,
    compareAtPrice: Number.isFinite(compare) && compare > 0 ? compare : undefined,
    tags: Array.isArray(p.tags) ? p.tags.join(',') : undefined,
  }
}

const SORT_TO_SHOPIFY: Record<
  Exclude<SortKey, 'featured'>,
  {sortKey: string; reverse: boolean}
> = {
  newest: {sortKey: 'CREATED', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
}

export async function fetchShopChunk(args: {
  handle: string
  params: ShopSearchParams
  offset?: number
  cursor?: string
}): Promise<ShopChunkResult> {
  const {handle, params} = args
  const sort: SortKey = params.sort ?? 'featured'

  // Facets needed to translate kebab params to Shopify labels
  const facets = await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)

  if (sort === 'featured') {
    const offset = args.offset ?? 0
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(),
      getAllProductsForFilters(handle, filters),
    ])
    const matchByHandle = new Map<string, ShopifyProductNode>(
      matching.map((p: ShopifyProductNode) => [p.handle, p]),
    )
    const ordered = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
    const slice = ordered.slice(offset, offset + CHUNK_SIZE)
    return {
      products: slice.map(shopifyToCard),
      hasMore: offset + CHUNK_SIZE < ordered.length,
      nextOffset: offset + CHUNK_SIZE,
    }
  }

  const ship = SORT_TO_SHOPIFY[sort]
  const page = await getCollectionProducts(handle, {
    filters,
    sortKey: ship.sortKey,
    reverse: ship.reverse,
    first: CHUNK_SIZE,
    after: args.cursor ?? null,
  } as any)
  return {
    products: page.nodes.map((p: ShopifyProductNode) => shopifyToCard(p)),
    hasMore: page.pageInfo.hasNextPage,
    nextCursor: page.pageInfo.endCursor ?? undefined,
  }
}

export async function getFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const facets = await getCollectionFilters(args.handle, {filters: []})
  const filters = buildShopifyFilters(args.params, facets)
  if ((args.params.sort ?? 'featured') === 'featured') {
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(),
      getAllProductsForFilters(args.handle, filters),
    ])
    const set = new Set(matching.map((p: ShopifyProductNode) => p.handle))
    return orderedHandles.filter((h) => set.has(h)).length
  }
  const all = await getAllProductsForFilters(args.handle, filters)
  return all.length
}
