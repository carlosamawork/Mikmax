import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const view = params.view ?? '4col'

  const {cards, facets} = await buildAllCards(handle, params)
  const total = cards.length
  const products: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      <Suspense fallback={<ProductGridSkeleton view={view} />}>
        <ProductGrid products={products} view={view} hasActiveFilters={products.length === 0}>
          <InfiniteScrollSentinel
            handle={handle}
            params={params}
            initialOffset={CHUNK_SIZE}
            hasMore={hasMore}
          />
        </ProductGrid>
      </Suspense>
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
