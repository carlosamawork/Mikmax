import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {getOrderedHandles} from '@/sanity/queries/queries/shop'
import {
  getCollectionFilters,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {buildShopifyFilters, parseSearchParams} from '@/lib/shop/searchParams'
import {expandProductsToCards} from '@/lib/shop/expandToCards'
import {CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'

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

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const sort = params.sort ?? 'featured'
  const view = params.view ?? '4col'

  const [facetsRaw, orderedHandles] = await Promise.all([
    getCollectionFilters(handle, {filters: []}),
    sort === 'featured' ? getOrderedHandles() : Promise.resolve<string[]>([]),
  ])

  const facets = facetsRaw
  const filters = buildShopifyFilters(params, facets)

  const selectedColors = params.color ? params.color.split(',').filter(Boolean) : undefined

  let products: ProductCardData[] = []
  let total = 0
  let hasMore = false
  let nextOffset: number | undefined
  let nextCursor: string | undefined

  if (sort === 'featured') {
    const matching = (await getAllProductsForFilters(handle, filters)) as ShopifyProductNode[]
    const matchByHandle = new Map<string, ShopifyProductNode>(
      matching.map((p) => [p.handle, p]),
    )
    const ordered = orderedHandles
      .map((h) => matchByHandle.get(h))
      .filter((p): p is ShopifyProductNode => Boolean(p))
    const allCards = expandProductsToCards(ordered, selectedColors)
    total = allCards.length
    products = allCards.slice(0, CHUNK_SIZE)
    hasMore = total > CHUNK_SIZE
    nextOffset = CHUNK_SIZE
  } else {
    const SORT_MAP: Record<string, {sortKey: string; reverse: boolean}> = {
      newest: {sortKey: 'CREATED', reverse: true},
      'price-asc': {sortKey: 'PRICE', reverse: false},
      'price-desc': {sortKey: 'PRICE', reverse: true},
      'best-selling': {sortKey: 'BEST_SELLING', reverse: false},
    }
    const map = SORT_MAP[sort]
    const page = await getCollectionProducts(handle, {
      filters,
      sortKey: map.sortKey,
      reverse: map.reverse,
      first: CHUNK_SIZE,
    } as Parameters<typeof getCollectionProducts>[1])
    products = expandProductsToCards(page.nodes as ShopifyProductNode[], selectedColors)
    hasMore = page.pageInfo.hasNextPage
    nextCursor = page.pageInfo.endCursor ?? undefined
    const all = (await getAllProductsForFilters(handle, filters)) as ShopifyProductNode[]
    total = expandProductsToCards(all, selectedColors).length
  }

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
        initialCursor={nextCursor}
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
