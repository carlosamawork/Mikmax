'use client'
import {useEffect, useRef, useState} from 'react'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import {fetchShopChunk} from '@/app/(frontend)/shop/actions'
import type {ProductCardData, ShopSearchParams} from '@/types/shop'

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
        <ProductCard
          key={p.id}
          product={{
            _id: p.id,
            title: p.title,
            handle: p.handle,
            imageUrl: p.imageUrl,
            minPrice: p.minPrice,
            maxPrice: p.maxPrice,
            compareAtPrice: p.compareAtPrice,
            tags: p.tags,
            availableForSale: p.availableForSale,
          }}
        />
      ))}
      {hasMore && <div ref={ref} style={{height: 1}} aria-hidden="true" />}
    </>
  )
}
