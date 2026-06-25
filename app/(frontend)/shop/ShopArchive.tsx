import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import EditorialGrid from '@/components/Shop/EditorialGrid/EditorialGrid'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {getCardsForRequest, searchKeyFor} from '@/lib/shop/cards'
import {getCollectionEditorialImages} from '@/sanity/queries/queries/shop'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'
import {getResellerPercent, applyResellerToCard} from '@/lib/b2b/pricing'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)

  const {cards, facets} = await getCardsForRequest(handle, searchKeyFor(searchParams))
  // Editoriales solo en páginas de colección; /shop ('all') no tiene documento
  // collection. La vista 2 (editorial) está SIEMPRE disponible: sin imágenes de
  // colección el grid editorial se compone únicamente de productos destacados.
  const editorials = handle !== ALL_HANDLE ? await getCollectionEditorialImages(handle) : []
  const view = params.view ?? '4col'
  const total = cards.length
  const rawProducts: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const resellerPercent = await getResellerPercent()
  const products = resellerPercent
    ? rawProducts.map((c) => applyResellerToCard(c, resellerPercent))
    : rawProducts
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      {view === 'editorial' ? (
        <EditorialGrid
          handle={handle}
          params={params}
          initialProducts={products}
          initialOffset={CHUNK_SIZE}
          hasMore={hasMore}
          editorials={editorials}
        />
      ) : (
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
      )}
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
