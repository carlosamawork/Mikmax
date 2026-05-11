import {Suspense} from 'react'
import Breadcrumb from '@/components/Shop/Breadcrumb/Breadcrumb'
import PageHeader from '@/components/Shop/PageHeader/PageHeader'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {getCollectionByHandle, getOrderedHandles} from '@/sanity/queries/queries/shop'
import {
  getCollectionFilters,
  getCollectionMeta,
  getCollectionProducts,
  getAllProductsForFilters,
} from '@/lib/shopify'
import {buildShopifyFilters, getActiveFilters, parseSearchParams} from '@/lib/shop/searchParams'
import {
  ALL_HANDLE,
  CHUNK_SIZE,
  type BreadcrumbCrumb,
  type ProductCardData,
  type ShopSearchParams,
} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
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
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const sort = params.sort ?? 'featured'
  const view = params.view ?? '4col'

  const [sanityCol, shopifyMeta, facetsRaw, orderedHandles] = await Promise.all([
    getCollectionByHandle(handle),
    getCollectionMeta(handle),
    getCollectionFilters(handle, {filters: []}),
    sort === 'featured' ? getOrderedHandles() : Promise.resolve<string[]>([]),
  ])

  const title = sanityCol?.title ?? shopifyMeta?.title ?? (handle === ALL_HANDLE ? 'Shop' : handle)
  const description =
    sanityCol?.descriptionHtml ?? shopifyMeta?.descriptionHtml ?? undefined
  const crumbs = buildCrumbs(handle, sanityCol)
  const facets = facetsRaw
  const filters = buildShopifyFilters(params, facets)
  const active = getActiveFilters(params, facets)

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
    total = ordered.length
    const slice = ordered.slice(0, CHUNK_SIZE)
    products = slice.map(toCard)
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
    products = (page.nodes as ShopifyProductNode[]).map(toCard)
    hasMore = page.pageInfo.hasNextPage
    nextCursor = page.pageInfo.endCursor ?? undefined
    const all = (await getAllProductsForFilters(handle, filters)) as ShopifyProductNode[]
    total = all.length
  }

  const isOpen = params.filters === 'open'

  return (
    <>
      <Breadcrumb crumbs={crumbs} />
      <PageHeader
        title={title}
        count={total}
        view={view}
        active={active}
        description={description}
      />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid
          products={products}
          view={view}
          hasActiveFilters={active.length > 0}
        />
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

function buildCrumbs(
  handle: string,
  col: Awaited<ReturnType<typeof getCollectionByHandle>>,
): BreadcrumbCrumb[] {
  const out: BreadcrumbCrumb[] = [{label: 'Home', href: '/'}]
  if (handle === ALL_HANDLE) {
    out.push({label: 'Shop', href: null})
    return out
  }
  out.push({label: 'Shop', href: '/shop'})
  if (col?.parent?.parent) {
    out.push({
      label: col.parent.parent.title,
      href: `/shop/${col.parent.parent.handle}`,
    })
  }
  if (col?.parent) {
    out.push({label: col.parent.title, href: `/shop/${col.parent.handle}`})
  }
  out.push({label: col?.title ?? handle, href: null})
  return out
}

function toCard(p: ShopifyProductNode): ProductCardData {
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
