// app/(frontend)/shop/actions.ts
'use server'

import {
  getCollectionFilters,
  getAllProductsForFilters,
  getAllShopFilters,
  getAllShopProducts,
} from '@/lib/shopify'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {buildShopifyFilters, extractSelectedColorGids} from '@/lib/shop/searchParams'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {applyCardFilters, sortCards} from '@/lib/shop/filterAndSortCards'
import {ALL_HANDLE, CHUNK_SIZE} from '@/types/shop'
import type {ShopChunkResult, ShopSearchParams, SortKey} from '@/types/shop'

type ShopifyVariantNode = {
  id: string
  availableForSale: boolean
  image?: {url: string; altText?: string | null} | null
  price: {amount: string}
  compareAtPrice?: {amount: string} | null
  selectedOptions: {name: string; value: string}[]
  colorPattern?: {
    type: string
    value: string | null
    references?: {
      nodes: Array<{id: string; name?: string; handle?: string}>
    } | null
  } | null
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

const SORT_MAP: Record<
  'newest' | 'price-asc' | 'price-desc' | 'best-selling',
  {sortKey: string; reverse: boolean}
> = {
  newest: {sortKey: 'CREATED', reverse: true},
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
  'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
}

const SEARCH_SORT_MAP: Partial<Record<
  'newest' | 'price-asc' | 'price-desc' | 'best-selling',
  {sortKey: string; reverse: boolean}
>> = {
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
}

async function buildAllCards(handle: string, params: ShopSearchParams) {
  const isAll = handle === ALL_HANDLE
  const facets = isAll
    ? await getAllShopFilters({filters: []})
    : await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)
  const selectedColorGids = extractSelectedColorGids(params, facets)
  const sort: SortKey = params.sort ?? 'featured'
  const shopifySort = sort === 'featured' ? undefined : SORT_MAP[sort as keyof typeof SORT_MAP]
  const searchSort =
    sort === 'featured' ? undefined : SEARCH_SORT_MAP[sort as keyof typeof SEARCH_SORT_MAP]

  const [orderedHandles, matching] = await Promise.all([
    sort === 'featured' ? getOrderedHandles() : Promise.resolve<string[]>([]),
    (isAll
      ? getAllShopProducts(filters, searchSort ?? {})
      : getAllProductsForFilters(handle, filters, shopifySort ?? {})) as Promise<
      ShopifyProductNode[]
    >,
  ])

  let orderedProducts: ShopifyProductNode[]
  if (sort === 'featured') {
    const matchByHandle = new Map<string, ShopifyProductNode>(
      matching.map((p) => [p.handle, p]),
    )
    orderedProducts = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
  } else {
    orderedProducts = matching
  }

  const expanded = expandProductsToCards(orderedProducts, selectedColorGids)
  const filtered = applyCardFilters(expanded, params)
  return sortCards(filtered, sort)
}

export async function fetchShopChunk(args: {
  handle: string
  params: ShopSearchParams
  offset?: number
  cursor?: string
}): Promise<ShopChunkResult> {
  const offset = args.offset ?? 0
  const cards = await buildAllCards(args.handle, args.params)
  const slice = cards.slice(offset, offset + CHUNK_SIZE)
  return {
    products: slice,
    hasMore: offset + CHUNK_SIZE < cards.length,
    nextOffset: offset + CHUNK_SIZE,
  }
}

export async function getFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const cards = await buildAllCards(args.handle, args.params)
  return cards.length
}
