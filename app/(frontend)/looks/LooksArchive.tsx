import ShopToolbar from '@/components/Shop/ShopToolbar/ShopToolbar'
import FilterDrawer from '@/components/Shop/FilterDrawer/FilterDrawer'
import LookGrid from '@/components/Looks/LookGrid/LookGrid'
import {getAllShopFilters} from '@/lib/shopify'
import {getLookArchiveItems} from '@/lib/look/buildLooksArchive'
import {parseSearchParams} from '@/lib/shop/searchParams'
import type {ShopSearchParams, SortKey} from '@/types/shop'
import {getLookFilterCount} from './actions'

const LOOK_SORT_OPTIONS: SortKey[] = ['featured', 'price-asc', 'price-desc']

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function LooksArchive({searchParams}: Props) {
  const params: ShopSearchParams = parseSearchParams(searchParams)
  const view = params.view ?? '4col'

  const facets = await getAllShopFilters({filters: []})
  const items = await getLookArchiveItems(params, facets)

  const hasActiveFilters = !!(
    params.color ||
    params.material ||
    params.size ||
    params.priceMin ||
    params.priceMax
  )
  const isOpen = params.filters === 'open'

  return (
    <>
      <ShopToolbar view={view} />
      <LookGrid looks={items} view={view} hasActiveFilters={hasActiveFilters} />
      <FilterDrawer
        handle="looks"
        open={isOpen}
        facets={facets}
        defaults={params}
        initialCount={items.length}
        countAction={getLookFilterCount}
        sortOptions={LOOK_SORT_OPTIONS}
      />
    </>
  )
}
