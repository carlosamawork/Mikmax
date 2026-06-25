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

// Mapea el ProductCardData del feed al shape que espera ProductCard.
export function toCardProps(p: ProductCardData) {
  return {
    _id: p.id,
    title: p.title,
    handle: p.handle,
    imageUrl: p.imageUrl,
    secondaryImageUrl: p.secondaryImageUrl,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    compareAtPrice: p.compareAtPrice,
    tags: p.tags,
    availableForSale: p.availableForSale,
    colorSlug: p.colorSlug,
    colorLabel: p.colorLabel,
    imageAlt: p.imageAlt,
  }
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
      style={{['--cols' as string]: view === '2col' ? 2 : 4} as CSSProperties}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={toCardProps(p)} />
      ))}
      {children}
    </div>
  )
}

export function ProductGridSkeleton({view}: {view: ViewMode}) {
  const count = view === '2col' ? 6 : 8
  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '2col' ? 2 : 4} as CSSProperties}
    >
      {Array.from({length: count}).map((_, i) => (
        <div key={i} className={s.skeleton} />
      ))}
    </div>
  )
}
