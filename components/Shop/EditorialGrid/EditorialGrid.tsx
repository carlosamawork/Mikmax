'use client'
import {useEffect, useRef, useState, type CSSProperties} from 'react'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import {toCardProps} from '@/components/Shop/ProductGrid/ProductGrid'
import EditorialCard from '@/components/Shop/EditorialCard/EditorialCard'
import {buildVista2Layout} from '@/lib/shop/editorialLayout'
import {fetchShopChunk} from '@/app/(frontend)/shop/actions'
import type {EditorialImage, ProductCardData, ShopSearchParams} from '@/types/shop'
import s from './EditorialGrid.module.scss'

interface Props {
  handle: string
  params: ShopSearchParams
  initialProducts: ProductCardData[]
  initialOffset?: number
  initialCursor?: string
  hasMore: boolean
  editorials: EditorialImage[]
}

// Vista 2 — grid editorial. A diferencia del resto del shop, mantiene la lista
// completa de productos en cliente (SSR inicial + chunks del infinite scroll) y
// recalcula el layout por bloques sobre toda la lista, para que el patrón 2×2 y
// la colocación de imágenes sean consistentes y deterministas.
export default function EditorialGrid({
  handle,
  params,
  initialProducts,
  initialOffset,
  initialCursor,
  hasMore: initialHasMore,
  editorials,
}: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [offset, setOffset] = useState(initialOffset)
  const [cursor, setCursor] = useState(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    setProducts(initialProducts)
    setOffset(initialOffset)
    setCursor(initialCursor)
    setHasMore(initialHasMore)
  }, [initialProducts, initialOffset, initialCursor, initialHasMore, handle, paramsKey])

  useEffect(() => {
    if (!ref.current || !hasMore) return
    const target = ref.current
    const obs = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || loading || !hasMore) return
        setLoading(true)
        const res = await fetchShopChunk({handle, params, offset, cursor})
        setProducts((prev) => [...prev, ...res.products])
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

  const slots = buildVista2Layout(products, editorials, handle)

  return (
    <>
      <div className={s.grid}>
        {slots.map((slot) => {
          const style = {['--col']: slot.col, ['--row']: slot.row} as CSSProperties
          if (slot.kind === 'featured-image') {
            return (
              <EditorialCard key={slot.key} image={slot.image} fill className={s.featured} style={style} />
            )
          }
          if (slot.kind === 'featured-product') {
            return (
              <ProductCard
                key={slot.key}
                product={toCardProps(slot.product)}
                fill
                preferSecondary
                className={s.featured}
                style={style}
              />
            )
          }
          if (slot.kind === 'spacer') {
            return <div key={slot.key} aria-hidden className={`${s.cell} ${s.spacer}`} style={style} />
          }
          return (
            <ProductCard
              key={slot.key}
              product={toCardProps(slot.product)}
              fill
              className={s.cell}
              style={style}
            />
          )
        })}
      </div>
      {hasMore && <div ref={ref} className={s.sentinel} aria-hidden="true" />}
    </>
  )
}
