// app/(frontend)/shop/actions.ts
'use server'

import {
  getCollectionFilters,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters} from '@/lib/shop/searchParams'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {CHUNK_SIZE} from '@/types/shop'
import type {ShopChunkResult, ShopSearchParams, SortKey} from '@/types/shop'

type ShopifyVariantNode = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null} | null
  price: {amount: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
}

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
  options?: {name: string; values: string[]}[]
  variants?: {nodes: ShopifyVariantNode[]}
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
  const selectedColors = params.color ? params.color.split(',').filter(Boolean) : undefined

  const facets = await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)

  if (sort === 'featured') {
    const offset = args.offset ?? 0
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(),
      getAllProductsForFilters(handle, filters),
    ])
    const matchByHandle = new Map<string, ShopifyProductNode>(
      (matching as ShopifyProductNode[]).map((p) => [p.handle, p]),
    )
    const ordered = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
    const allCards = expandProductsToCards(ordered, selectedColors)
    const slice = allCards.slice(offset, offset + CHUNK_SIZE)
    return {
      products: slice,
      hasMore: offset + CHUNK_SIZE < allCards.length,
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
  } as Parameters<typeof getCollectionProducts>[1])
  return {
    products: expandProductsToCards(page.nodes as ShopifyProductNode[], selectedColors),
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
  const selectedColors = args.params.color
    ? args.params.color.split(',').filter(Boolean)
    : undefined
  if ((args.params.sort ?? 'featured') === 'featured') {
    const [orderedHandles, matching] = await Promise.all([
      getOrderedHandles(),
      getAllProductsForFilters(args.handle, filters),
    ])
    const matchByHandle = new Map<string, ShopifyProductNode>(
      (matching as ShopifyProductNode[]).map((p) => [p.handle, p]),
    )
    const ordered = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
    return expandProductsToCards(ordered, selectedColors).length
  }
  const all = (await getAllProductsForFilters(args.handle, filters)) as ShopifyProductNode[]
  return expandProductsToCards(all, selectedColors).length
}
