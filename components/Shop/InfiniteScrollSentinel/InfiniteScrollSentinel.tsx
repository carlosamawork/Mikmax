'use client'
import {useEffect, useRef, useState} from 'react'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import {toCardProps} from '@/components/Shop/ProductGrid/ProductGrid'
import {fetchShopChunk} from '@/app/(frontend)/shop/actions'
import {ALL_HANDLE, type ProductCardData, type ShopSearchParams} from '@/types/shop'
import {cardToAnalyticsItem} from '@/lib/analytics/item'
import {trackViewItemList} from '@/lib/analytics/track'

interface Props {
  handle: string
  params: ShopSearchParams
  initialOffset?: number
  initialCursor?: string
  hasMore: boolean
}

export default function InfiniteScrollSentinel({
  handle,
  params,
  initialOffset,
  initialCursor,
  hasMore: initialHasMore,
}: Props) {
  const [items, setItems] = useState<ProductCardData[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    setItems([])
    setOffset(initialOffset)
    setCursor(initialCursor)
    setHasMore(initialHasMore)
  }, [initialOffset, initialCursor, initialHasMore, handle, paramsKey])

  useEffect(() => {
    if (!ref.current || !hasMore) return
    const target = ref.current
    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loading || !hasMore) return
        setLoading(true)
        const res = await fetchShopChunk({handle, params, offset, cursor})
        // Cada chunk nuevo del scroll infinito es un view_item_list adicional
        // (mismo list name que el push inicial de TrackViewItemList).
        trackViewItemList(
          res.products.map(cardToAnalyticsItem),
          handle === ALL_HANDLE ? 'shop' : handle,
        )
        setItems((prev) => [...prev, ...res.products])
        setOffset(res.nextOffset)
        setCursor(res.nextCursor)
        setHasMore(res.hasMore)
        setLoading(false)
      },
      {rootMargin: '600px'},
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [handle, params, offset, cursor, hasMore, loading])

  return (
    <>
      {items.map((p) => (
        <ProductCard key={p.id} product={toCardProps(p)} />
      ))}
      {hasMore && <div ref={ref} style={{height: 1, gridColumn: '1 / -1'}} aria-hidden="true" />}
    </>
  )
}
