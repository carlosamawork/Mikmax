'use server'

import {buildAllCards} from '@/lib/shop/buildCards'
import {ALL_HANDLE} from '@/types/shop'
import type {ProductCardData} from '@/types/shop'

export type PredictiveResult = {
  cards: ProductCardData[]
  total: number
}

const PREVIEW_LIMIT = 6

export async function predictiveSearch(q: string): Promise<PredictiveResult> {
  const query = q.trim()
  if (!query) return {cards: [], total: 0}
  const {cards} = await buildAllCards(ALL_HANDLE, {q: query, sort: 'relevance'})
  return {cards: cards.slice(0, PREVIEW_LIMIT), total: cards.length}
}
