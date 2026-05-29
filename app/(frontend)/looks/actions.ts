// app/(frontend)/looks/actions.ts
'use server'

import {getAllShopFilters} from '@/lib/shopify'
import {getLookArchiveItems} from '@/lib/look/buildLooksArchive'
import type {ShopSearchParams} from '@/types/shop'

export async function getLookFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const facets = await getAllShopFilters({filters: []})
  const items = await getLookArchiveItems(args.params, facets)
  return items.length
}
