import type {Metadata} from 'next'
import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import TrackViewItemList from '@/components/Common/Analytics/TrackViewItemList'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type SortKey} from '@/types/shop'
import {getResellerPercent, applyResellerToCard} from '@/lib/b2b/pricing'
import s from './search.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search | Mikmax',
  robots: {index: false, follow: true},
}

const SEARCH_SORTS: SortKey[] = ['relevance', 'price-asc', 'price-desc']

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SearchPage({searchParams}: Props) {
  const raw = await searchParams
  const params = parseSearchParams(raw)
  const q = (params.q ?? '').trim()
  const view = params.view ?? '4col'

  if (!q) {
    return (
      <div className={s.empty}>
        <p className={s.emptyTitle}>Search products</p>
        <p className={s.emptyText}>Type in the search bar to see results.</p>
      </div>
    )
  }

  const {cards, facets} = await buildAllCards(ALL_HANDLE, params)
  const total = cards.length
  const rawProducts: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const resellerPercent = await getResellerPercent()
  const products = resellerPercent
    ? rawProducts.map((c) => applyResellerToCard(c, resellerPercent))
    : rawProducts
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'
  // Whether the user has narrowed the search with filters (beyond the query itself).
  const hasFilters = Boolean(
    params.productType ||
    params.color ||
    params.size ||
    params.pattern ||
    params.material ||
    params.priceMin ||
    params.priceMax ||
    params.available,
  )

  return (
    <>
      <TrackViewItemList products={products} listName="search" />
      <header className={s.head}>
        <h1 className={s.title}>Results for «{q}»</h1>
        <p className={s.count}>{total} products</p>
      </header>
      <ShopToolbar view={view} flush />
      {total > 0 ? (
        <Suspense fallback={<ProductGridSkeleton view={view} />}>
          <ProductGrid products={products} view={view}>
            <InfiniteScrollSentinel
              handle={ALL_HANDLE}
              params={params}
              initialOffset={CHUNK_SIZE}
              hasMore={hasMore}
            />
          </ProductGrid>
        </Suspense>
      ) : (
        <div className={s.empty}>
          <p className={s.emptyTitle}>No results</p>
          <p className={s.emptyText}>
            No products found for «{q}»{hasFilters ? ' with those filters' : ''}.
          </p>
        </div>
      )}
      <FilterDrawer
        handle={ALL_HANDLE}
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={total}
        sortOptions={SEARCH_SORTS}
        defaultSort="relevance"
      />
    </>
  )
}
