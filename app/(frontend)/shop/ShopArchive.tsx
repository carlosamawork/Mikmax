import {Suspense} from 'react'
import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import ProductGrid, {ProductGridSkeleton} from '@/components/Shop/ProductGrid/ProductGrid'
import InfiniteScrollSentinel from '@/components/Shop/InfiniteScrollSentinel/InfiniteScrollSentinel'
import EditorialGrid from '@/components/Shop/EditorialGrid/EditorialGrid'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards} from '@/lib/shop/buildCards'
import {getCollectionEditorialImages} from '@/sanity/queries/queries/shop'
import {ALL_HANDLE, CHUNK_SIZE, type ProductCardData, type ShopSearchParams} from '@/types/shop'

interface Props {
  handle: string
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ShopArchive({handle, searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)

  const {cards, facets} = await buildAllCards(handle, params)
  // Editoriales solo en páginas de colección; /shop ('all') no tiene documento
  // collection. Se piden siempre (no solo en la vista editorial) para decidir si
  // ofrecer la vista 2 en el toggle.
  const editorials = handle !== ALL_HANDLE ? await getCollectionEditorialImages(handle) : []
  const hasEditorial = editorials.length > 0
  // La vista editorial solo es válida si hay imágenes; si no, cae a 4col.
  const requested = params.view ?? '4col'
  const view = requested === 'editorial' && !hasEditorial ? '4col' : requested
  const total = cards.length
  const products: ProductCardData[] = cards.slice(0, CHUNK_SIZE)
  const hasMore = total > CHUNK_SIZE
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} hasEditorial={hasEditorial} />
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
