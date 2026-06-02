import type {Metadata} from 'next'
import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type SortKey} from '@/types/shop'
import s from './search.module.scss'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Buscar | Mikmax',
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
        <p className={s.emptyTitle}>Busca productos</p>
        <p className={s.emptyText}>Escribe en el buscador para ver resultados.</p>
      </div>
    )
  }

  const {cards, facets} = await buildAllCards(ALL_HANDLE, params)
  const total = cards.length
  const products: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
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
      <header className={s.head}>
        <h1 className={s.title}>Resultados para «{q}»</h1>
        <p className={s.count}>{total} productos</p>
      </header>
      <ShopToolbar view={view} />
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
          <p className={s.emptyTitle}>Sin resultados</p>
          <p className={s.emptyText}>
            No encontramos productos para «{q}»{hasFilters ? ' con esos filtros' : ''}.
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
