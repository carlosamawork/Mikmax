'use client'

import {useEffect} from 'react'
import type {ProductCardData} from '@/types/shop'
import {cardToAnalyticsItem} from '@/lib/analytics/item'
import {trackViewItemList} from '@/lib/analytics/track'

type Props = {
  products: ProductCardData[]
  listName: string
}

// Empuja view_item_list al dataLayer con el chunk inicial del listado.
// Los chunks del infinite scroll los empuja InfiniteScrollSentinel al cargarlos.
export default function TrackViewItemList({products, listName}: Props) {
  const key = products.map((p) => p.id).join('|')

  useEffect(() => {
    trackViewItemList(products.map(cardToAnalyticsItem), listName)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, listName])

  return null
}
