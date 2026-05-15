import Link from 'next/link'
import type {ReactNode, CSSProperties} from 'react'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import type {ProductCardData, ViewMode} from '@/types/shop'
import s from './ProductGrid.module.scss'

interface Props {
  products: ProductCardData[]
  view: ViewMode
  hasActiveFilters?: boolean
  children?: ReactNode
}

export default function ProductGrid({products, view, hasActiveFilters, children}: Props) {
  if (products.length === 0) {
    return (
      <div className={s.empty}>
        {hasActiveFilters ? (
          <>
            <p>No products match your filters.</p>
            <Link href="?">Clear filters</Link>
          </>
        ) : (
          <>
            <p>No products yet.</p>
            <Link href="/shop">Back to Shop</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '4col' ? 4 : 2} as CSSProperties}
    >
      {products.map((p) => (
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
            colorSlug: p.colorSlug,
          }}
        />
      ))}
      {children}
    </div>
  )
}

export function ProductGridSkeleton({view}: {view: ViewMode}) {
  const count = view === '4col' ? 8 : 6
  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '4col' ? 4 : 2} as CSSProperties}
    >
      {Array.from({length: count}).map((_, i) => (
        <div key={i} className={s.skeleton} />
      ))}
    </div>
  )
}
