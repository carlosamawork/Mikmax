import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {
  getCollectionFilters,
  getAllProductsForFilters,
  getAllShopFilters,
  getAllShopProducts,
} from '@/lib/shopify'
import {
  buildShopifyFilters,
  extractSelectedColorGids,
  parseSearchParams,
} from '@/lib/shop/searchParams'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {applyCardFilters, sortCards} from '@/lib/shop/filterAndSortCards'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

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

// SearchSortKeys (used by the top-level `search` endpoint for /shop) only
// supports RELEVANCE and PRICE for products. Non-price sorts fall back to
// RELEVANCE; price sorts are re-applied client-side via sortCards anyway.
const SEARCH_SORT_MAP: Partial<Record<
  'newest' | 'price-asc' | 'price-desc' | 'best-selling',
  {sortKey: string; reverse: boolean}
>> = {
  'price-asc': {sortKey: 'PRICE', reverse: false},
  'price-desc': {sortKey: 'PRICE', reverse: true},
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const sort = params.sort ?? 'featured'
  const view = params.view ?? '4col'

  // Shopify exposes a variant taxonomy_metafield facet `filter.v.t.shopify.color-pattern`
  // whose values are the base color names (Pink, White, Beige…). We use those
  // directly — no grouping needed. For card-level filtering we resolve each
  // selected slug to its TaxonomyValue GID and compare with the per-variant
  // metafield.
  const isAll = handle === ALL_HANDLE
  const facets = isAll
    ? await getAllShopFilters({filters: []})
    : await getCollectionFilters(handle, {filters: []})
  const filters = buildShopifyFilters(params, facets)
  const selectedColorGids = extractSelectedColorGids(params, facets)

  // Pre-fetch order matters for non-card-level sorts (featured, newest,
  // best-selling). For price sorts we re-sort cards in JS later, so the initial
  // product order doesn't matter — but we still pass it through for safety.
  const shopifySort =
    sort === 'featured'
      ? undefined
      : SORT_MAP[sort as keyof typeof SORT_MAP]
  const searchSort =
    sort === 'featured'
      ? undefined
      : SEARCH_SORT_MAP[sort as keyof typeof SEARCH_SORT_MAP]
  const orderedHandlesPromise =
    sort === 'featured' ? getOrderedHandles() : Promise.resolve<string[]>([])
  const matchingPromise = (isAll
    ? getAllShopProducts(filters, searchSort ?? {})
    : getAllProductsForFilters(handle, filters, shopifySort ?? {})) as Promise<
    ShopifyProductNode[]
  >

  const [orderedHandles, matching] = await Promise.all([
    orderedHandlesPromise,
    matchingPromise,
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
  const sorted = sortCards(filtered, sort)

  const total = sorted.length
  const products: ProductCardData[] = sorted.slice(0, CHUNK_SIZE)
  const hasMore = total > CHUNK_SIZE
  const nextOffset = CHUNK_SIZE

  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid products={products} view={view} hasActiveFilters={products.length === 0} />
      </Suspense>
      <InfiniteScrollSentinel
        handle={handle}
        params={params}
        initialOffset={nextOffset}
        hasMore={hasMore}
      />
      <FilterDrawer
        handle={handle}
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={total}
      />
    </>
  )
}
