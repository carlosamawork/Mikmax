// app/(frontend)/shop/actions.ts
'use server'

import {buildAllCards} from '@/lib/shop/buildCards'
import {getResellerPercent, applyResellerToCard} from '@/lib/b2b/pricing'
import {CHUNK_SIZE} from '@/types/shop'
import type {ShopChunkResult, ShopSearchParams} from '@/types/shop'

export async function fetchShopChunk(args: {
  handle: string
  params: ShopSearchParams
  offset?: number
  cursor?: string
}): Promise<ShopChunkResult> {
  const offset = args.offset ?? 0
  const {cards} = await buildAllCards(args.handle, args.params)
  const rawSlice = cards.slice(offset, offset + CHUNK_SIZE)
  const resellerPercent = await getResellerPercent()
  const slice = resellerPercent
    ? rawSlice.map((c) => applyResellerToCard(c, resellerPercent))
    : rawSlice
  return {
    products: slice,
    hasMore: offset + CHUNK_SIZE < cards.length,
    nextOffset: offset + CHUNK_SIZE,
  }
}

export async function getFilterCount(args: {
  handle: string
  params: ShopSearchParams
}): Promise<number> {
  const {cards} = await buildAllCards(args.handle, args.params)
  return cards.length
}
